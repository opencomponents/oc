'use strict';

const path = require('path');

const cleanRequire = require('../../../utils/clean-require');
const installCompiler = require('./install-compiler');

module.exports = (options, cb) => {
  const { compilerDep, componentPath, logger, pkg } = options;
  const compilerPath = path.join(componentPath, 'node_modules', compilerDep);
  const compiler = cleanRequire(compilerPath, { justTry: true });

  if (compiler) {
    return cb(null, compiler);
  }

  let dependency = compilerDep;
  if (pkg.devDependencies[compilerDep]) {
    dependency += `@${pkg.devDependencies[compilerDep]}`;
  }

  const installOptions = {
    compilerPath,
    componentName: pkg.name,
    componentPath,
    dependency,
    logger
  };

  installCompiler(installOptions, cb);
};
