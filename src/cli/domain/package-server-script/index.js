'use strict';

var detective = require('detective');
var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var uglifyJs = require('uglify-js');
var falafel = require('falafel');
var _ = require('underscore');
var requirePackageName = require('require-package-name');

var CONST_MAX_ITERATIONS = require('../../../resources/settings').maxLoopIterations;
var hashBuilder = require('../../../utils/hash-builder');
var strings = require('../../../resources');
var getSandBoxedJs = require('./getSandBoxedJs');

var utils = require('./utils');
var missingDependencies = utils.missingDependencies;
var compress = utils.compress;

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
  var requires = { files: {}, modules: [] };
  var localRequires = detective(compress(serverContent, fileName));

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

module.exports = function(params, callback){

  var dataPath = path.join(params.componentPath, params.ocOptions.files.data);
  var fileName = 'server.js';
  var wrappedRequires;
  var sandboxedJs;
  var serverContent = fs.readFileSync(dataPath).toString();

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
    sandboxedJs = getSandBoxedJs(wrappedRequires.files, serverContent, params.ocOptions.files.data, CONST_MAX_ITERATIONS);
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
