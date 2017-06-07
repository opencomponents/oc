'use strict';

const coreModules = require('builtin-modules');
const path = require('path');
const requirePackageName = require('require-package-name');
const tryRequire = require('try-require');
const _ = require('lodash');

const strings = require('../../resources');

const isCoreDependency = x => _.includes(coreModules, x);
const requireCoreDependency = x =>
  (isCoreDependency(x) && tryRequire(x)) || undefined;

const requireDependency = requirePath => {
  const nodeModulesPath = path.resolve('.', 'node_modules');
  const modulePath = path.resolve(nodeModulesPath, requirePath);
  return tryRequire(modulePath);
};

const throwError = requirePath => {
  throw {
    code: strings.errors.registry.DEPENDENCY_NOT_FOUND_CODE,
    missing: [requirePath]
  };
};

module.exports = injectedDependencies => requirePath => {
  const moduleName = requirePackageName(requirePath);
  const isAllowed = _.includes(injectedDependencies, moduleName);

  if (!isAllowed) {
    return throwError(requirePath);
  }

  return (
    requireDependency(requirePath) ||
    requireCoreDependency(requirePath) ||
    throwError(requirePath)
  );
};
