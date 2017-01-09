'use strict';

var detective = require('detective');
var requirePackageName = require('require-package-name');
var format = require('stringformat');
var _ = require('underscore');
var strings = require('../../../resources');
var compress = require('./compress');

var isLocalFile = function(f){
  return _.first(f) === '/' || _.first(f) === '.';
};

var getRequiredContent = function(componentPath, required, fs, path){
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

var getLocalDependencies = function(fs, path, componentPath, serverContent, fileName){
  var requires = { files: {}, modules: [] };
  var localRequires = detective(compress(serverContent, fileName));

  _.forEach(localRequires, function(required){
    if(isLocalFile(required)) {
      requires.files[required] = getRequiredContent(componentPath, required, fs, path);
    } else {
      var packageName = requirePackageName(required);
      requires.modules.push(packageName);
    }
  });
  return requires;
};

module.exports = function(fs, path){
  return getLocalDependencies.bind(null, fs, path);
};
