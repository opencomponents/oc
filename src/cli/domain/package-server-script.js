'use strict';

var detective = require('detective');
var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var uglifyJs = require('uglify-js');
var falafel = require('falafel');
var _ = require('underscore');
var requirePackageName = require('require-package-name');

var config = require('../../resources/settings');
var hashBuilder = require('../../utils/hash-builder');
var strings = require('../../resources');

var CONST_MAX_ITERATIONS = config.maxLoopIterations;

var wrapLoops = function(code){
  var loopKeywords = ['WhileStatement', 'ForStatement', 'DoWhileStatement'];
  return falafel(code, function (node) {
    if(loopKeywords.indexOf(node.type) > -1){
      node.update('{ var __ITER = ' + CONST_MAX_ITERATIONS + ';'
        + node.source() + '}');
    }

    if(!node.parent){
        return;
    }

    if(loopKeywords.indexOf(node.parent.type) > -1 && node.type === 'BlockStatement'){
      node.update('{ if(__ITER <=0){ throw new Error("loop exceeded maximum allowed iterations"); } '
        + node.source() + ' __ITER--; }');
    }
  }).toString();
};

var compress = function(code, fileName){
  try {
    return uglifyJs.minify(code, { fromString: true }).code;
  } catch (e){
    if(!!e.line && !!e.col){
      throw new Error(format(strings.errors.cli.SERVERJS_PARSING_ERROR, fileName, e.line, e.col, e.message));
    }
    throw e;
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
    throw new Error(strings.errors.cli.SERVERJS_REQUIRE_JS_NOT_ALLOWED);
  }

  var requiredPath = path.resolve(componentPath, required);

  if(!fs.existsSync(requiredPath)){
    throw new Error(format(strings.errors.cli.SERVERJS_REQUIRE_JSON_NOT_FOUND, required));
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
      var packageName = requirePackageName(required);
      requires.modules.push(packageName);
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

  return compress(wrapLoops(serverContent), fileName);
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
    return callback(new Error(format(strings.errors.cli.SERVERJS_DEPENDENCY_NOT_DECLARED, JSON.stringify(missingDeps))));
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
