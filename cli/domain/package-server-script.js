'use strict';

var detective = require('detective');
var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var uglifyJs = require('uglify-js');
var _ = require('underscore');

var hashBuilder = require('../../utils/hash-builder');
var strings = require('../../resources');

var isLocalFile = function(f){
  return _.first(f) === '/' || _.first(f) === '.';
};

var getLocalDependencies = function(componentPath, serverContent){

  var requires = { files: {}, modules: [] },
      localRequires;

  try {
    localRequires = detective(serverContent);
  } catch(e){
    throw new SyntaxError(e.message);
  }

  var tryEncapsulating = function(required){
    var requiredPath = path.resolve(componentPath, required),
        ext = path.extname(requiredPath).toLowerCase();

    if(ext === ''){
      requiredPath += '.json';
    } else if(ext !== '.json'){
      throw strings.errors.cli.SERVERJS_REQUIRE_JS_NOT_ALLOWED;
    }

    if(!fs.existsSync(requiredPath)){
      throw requiredPath + ' not found. Only json files are require-able.';
    }

    var content = fs.readFileSync(requiredPath).toString();
    return JSON.parse(content);
  };

  _.forEach(localRequires, function(required){
    if(isLocalFile(required)) {
      requires.files[required] = tryEncapsulating(required);
    } else {
      requires.modules.push(required);
    }
  });

  return requires;
};

var getSandBoxedJs = function(wrappedRequires, serverContent){
  if(_.keys(wrappedRequires).length > 0){
    serverContent = 'var __sandboxedRequire = require, __localRequires=' + JSON.stringify(wrappedRequires) +
                    ';require=function(x){return __localRequires[x] ? __localRequires[x] : __sandboxedRequire(x); };\n' +
                    serverContent;
  }

  return uglifyJs.minify(serverContent, {fromString: true}).code;
};

var missingDependencies = function(requires, dependencies){
  return _.filter(requires, function(dep){
    return !_.contains(_.keys(dependencies), dep);
  });
};

module.exports = function(params, callback){

  var dataPath = path.join(params.componentPath, params.ocOptions.files.data),
      fileName = 'server.js',
      wrappedRequires,
      sandboxedJs,
      serverContent = fs.readFileSync(dataPath).toString();

  try {
    wrappedRequires = getLocalDependencies(params.componentPath, serverContent);
  } catch(e){
    if(e instanceof SyntaxError){
      return callback(format(strings.errors.cli.SERVERJS_PARSING_ERROR, params.ocOptions.files.data, e));
    }
    return callback(e);
  }

  var missingDeps = missingDependencies(wrappedRequires.modules, params.dependencies);

  if(missingDeps.length > 0){
    return callback(format(strings.errors.cli.SERVERJS_DEPENDENCY_NOT_DECLARED, JSON.stringify(missingDeps)));
  }

  try {
    sandboxedJs = getSandBoxedJs(wrappedRequires.files, serverContent);
  } catch(e){
    var m = e.message;
    if(!!e.line && !!e.col){
      m = format('Javascript error found in {0} [{1},{2}]: {3}]', params.ocOptions.files.data, e.line, e.col, e.message);
    }
    return callback(m);
  }

  fs.writeFile(path.join(params.publishPath, fileName), sandboxedJs, function(err, res){
    callback(err, {
      type: 'node.js',
      hashKey: hashBuilder.fromString(sandboxedJs),
      src: fileName
    });
  });
};
