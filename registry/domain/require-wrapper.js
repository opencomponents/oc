'use strict';

var strings = require(__BASE + '/resources');
var _ = require('underscore');

module.exports = function(injectedDependencies){
  return function(moduleName){
    if(!!injectedDependencies && _.has(injectedDependencies, moduleName)){
      return injectedDependencies[moduleName];
    } else {
      throw {
        code: strings.errors.registry.DEPENDENCY_NOT_FOUND_CODE,
        missing: [moduleName]
      };
    }
  };
};