'use strict';

const path = require('path');
const _ = require('lodash');
const requirePackageName = require('require-package-name');

const strings = require('../../resources');

module.exports = function(injectedDependencies){
  return function(requirePath){
    const moduleName = requirePackageName(requirePath);

    if(!_.includes(injectedDependencies, moduleName)){
      throw {
        code: strings.errors.registry.DEPENDENCY_NOT_FOUND_CODE,
        missing: [moduleName]
      };
    }

    const nodeModulesPath = path.resolve('.', 'node_modules');
    const modulePath = path.resolve(nodeModulesPath, requirePath);

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
