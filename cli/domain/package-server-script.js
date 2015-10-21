'use strict';

var detective = require('detective');
var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var uglifyJs = require('uglify-js');
var falafel = require('falafel');
var _ = require('underscore');

var hashBuilder = require('../../utils/hash-builder');
var strings = require('../../resources');

var wrapLoops = function(code){
  var CONST_MAX_ITERATIONS = 1e9; // should this be configurable?
  var monitoredKeywords = ['WhileStatement', 'ForStatement', 'DoWhileStatement'];

  return falafel(code, function (node) {
    if(monitoredKeywords.indexOf(node.type) > -1){
      node.update('{ var __ITER = ' + CONST_MAX_ITERATIONS + ';'
        + node.source() + '}');
    }

    if(!node.parent){
        return;
    }

    if(monitoredKeywords.indexOf(node.parent.type) > -1 && node.type === 'BlockStatement'){
      node.update('{ if(__ITER <=0){ throw new Error("loop exceeded maximum allowed iterations"); } '
        + node.source() + ' __ITER--; }');
    }
  }).toString();
};

var compress = function(code, fileName){
  try {
    return uglifyJs.minify(code, { fromString: true }).code;
  } catch (e){
    var m = e.message;
    if(!!e.line && !!e.col){
      m = format(strings.errors.cli.SERVERJS_PARSING_ERROR, fileName, e.line, e.col, e.message);
    }
    throw m;
  }
};

var isLocalFile = function(f){
  return _.first(f) === '/' || _.first(f) === '.';
};

var getRequiredContent = function(componentPath, required){
  var ext = path.extname(required).toLowerCase();

  if(ext === ''){
    required += '.json';
  } else if(ext !== '.json'){
    throw strings.errors.cli.SERVERJS_REQUIRE_JS_NOT_ALLOWED;
  }

  var requiredPath = path.resolve(componentPath, required);

  if(!fs.existsSync(requiredPath)){
    throw format(strings.errors.cli.SERVERJS_REQUIRE_JSON_NOT_FOUND, required);
  }

  return fs.readJsonSync(requiredPath);
};

var getLocalDependencies = function(componentPath, serverContent, fileName){

  var requires = { files: {}, modules: [] },
      localRequires = detective(compress(serverContent, fileName));

  _.forEach(localRequires, function(required){
    if(isLocalFile(required)) {
      requires.files[required] = getRequiredContent(componentPath, required);
    } else {
      requires.modules.push(required);
    }
  });

  return requires;
};

var getSandBoxedJs = function(wrappedRequires, serverContent, fileName){
  if(_.keys(wrappedRequires).length > 0){
    serverContent = 'var __sandboxedRequire = require, ' + 
                    '    __localRequires=' + JSON.stringify(wrappedRequires) + ';' +
                    
                    'require=function(x){' +
                    '  return __localRequires[x] ? __localRequires[x] : __sandboxedRequire(x);' +
                    '};' +
                    '\n' + serverContent;
  }

  return compress(serverContent, fileName);
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
    wrappedRequires = getLocalDependencies(params.componentPath, serverContent, params.ocOptions.files.data);
  } catch(e){
    return callback(e);
  }

  var missingDeps = missingDependencies(wrappedRequires.modules, params.dependencies);

  if(missingDeps.length > 0){
    return callback(format(strings.errors.cli.SERVERJS_DEPENDENCY_NOT_DECLARED, JSON.stringify(missingDeps)));
  }

  try {
    sandboxedJs = getSandBoxedJs(wrappedRequires.files, serverContent, params.ocOptions.files.data);
  } catch(e){
    return callback(e);
  }

  fs.writeFile(path.join(params.publishPath, fileName), sandboxedJs, function(err, res){
    callback(err, {
      type: 'node.js',
      hashKey: hashBuilder.fromString(sandboxedJs),
      src: fileName
    });
  });
};
