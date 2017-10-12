'use strict';

const cleanRequire = require('../../../utils/clean-require');
const npm = require('../../../utils/npm-utils');

module.exports = (options, cb) => {
  const {
    compilerPath,
    componentName,
    componentPath,
    dependency,
    logger
  } = options;

  logger.warn(
    `Installing ${dependency} for component ${componentName}...`,
    true
  );

  const npmOptions = {
    dependency,
    installPath: componentPath,
    save: false,
    silent: true
  };
  npm.installDependency(npmOptions, err => {
    err ? logger.err('FAIL') : logger.ok('OK');
    const compiler = cleanRequire(compilerPath, { justTry: true });
    cb(null, compiler);
  });
};
