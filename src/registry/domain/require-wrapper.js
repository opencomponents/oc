'use strict';

const coreModules = require('builtin-modules');
const path = require('path');
const _ = require('lodash');
const requirePackageName = require('require-package-name');

const strings = require('../../resources');

const getError = (moduleName) => ({
  code: strings.errors.registry.DEPENDENCY_NOT_FOUND_CODE,
  missing: [moduleName]
});

const requireCoreDependency = (requirePath) => {
  if(_.includes(coreModules, requirePath)){
    return require(requirePath);
  }
  throw new Error();
};

const requireDependency = (requirePath) => {
  const nodeModulesPath = path.resolve('.', 'node_modules');
  const modulePath = path.resolve(nodeModulesPath, requirePath);
  return require(modulePath);
};

module.exports = (injectedDependencies) => (requirePath) => {
  const moduleName = requirePackageName(requirePath);

  if(!_.includes(injectedDependencies, moduleName)){
    throw getError(moduleName);
  }

  try {
    return requireDependency(requirePath);
  } catch (e) {
    try {
      return requireCoreDependency(requirePath);
    } catch (e) {
      throw getError(requirePath);
    }
  }
};
