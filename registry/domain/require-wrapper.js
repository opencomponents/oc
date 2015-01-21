'use strict';

var _ = require('underscore');

module.exports = function(injectedDependencies){
  return function(moduleName){
    if(!!injectedDependencies && _.has(injectedDependencies, moduleName)){
      return injectedDependencies[moduleName];
    } else {
      return undefined;
    }
  };
};