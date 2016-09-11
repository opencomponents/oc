'use strict';

var _ = require('underscore');

var strings = require('../../resources');

module.exports = function(injectedDependencies){ console.log(injectedDependencies);
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