'use strict';

var path = require('path');
var _ = require('underscore');
var requirePackageName = require('require-package-name');

var strings = require('../../resources');

module.exports = function(injectedDependencies){
  return function(requirePath){
    var moduleName = requirePackageName(requirePath);

    if(!_.contains(injectedDependencies, moduleName)){
      throw {
        code: strings.errors.registry.DEPENDENCY_NOT_FOUND_CODE,
        missing: [moduleName]
      }; 
    }

    var nodeModulesPath = path.resolve('.', 'node_modules');
    var modulePath = path.resolve(nodeModulesPath, requirePath);

    try {
      return require(modulePath);
    } catch (e) {
      throw {
        code: strings.errors.registry.DEPENDENCY_NOT_FOUND_CODE,
        missing: [modulePath]
      }; 
    }
  };
};
