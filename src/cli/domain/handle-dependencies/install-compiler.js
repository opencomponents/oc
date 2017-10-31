'use strict';

const format = require('stringformat');

const cleanRequire = require('../../../utils/clean-require');
const isTemplateValid = require('../../../utils/is-template-valid');
const npm = require('../../../utils/npm-utils');
const strings = require('../../../resources/index');

module.exports = (options, cb) => {
  const {
    compilerPath,
    componentName,
    componentPath,
    dependency,
    logger
  } = options;

  logger.warn(format(strings.messages.cli.INSTALLING_DEPS, dependency), true);

  const npmOptions = {
    dependency,
    installPath: componentPath,
    save: false,
    silent: true
  };

  npm.installDependency(npmOptions, err => {
    err ? logger.err('FAIL') : logger.ok('OK');
    const compiler = cleanRequire(compilerPath, { justTry: true });
    const isOk = isTemplateValid(compiler);
    const errorMsg = 'There was a problem while installing the compiler';
    cb(!err && isOk ? null : errorMsg, compiler);
  });
};
