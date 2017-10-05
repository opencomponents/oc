'use strict';

const tryRequire = require('try-require');

const isValidTemplate = require('../../../utils/isValidTemplate');
const npm = require('../../../utils/npm-utils');
const strings = require('../../../resources');

module.exports = function installTemplate(options, callback) {
  const {
    compiler,
    componentName,
    componentPath,
    logger,
    templateType
  } = options;

  const npmOptions = {
    dependency: compiler,
    installPath: componentPath,
    isDev: true,
    save: true
  };

  logger.log(strings.messages.cli.installCompiler(compiler));

  npm.installDependency(npmOptions, (err, result) => {
    const errorMessage = 'template type not valid';
    if (err) {
      return callback(errorMessage);
    }

    const installedCompiler = tryRequire(result.dest);

    if (!isValidTemplate(installedCompiler, { compiler: true })) {
      return callback(errorMessage);
    }
    const version = installedCompiler.getInfo().version;
    logger.log(
      strings.messages.cli.installCompilerSuccess(
        templateType,
        compiler,
        version
      )
    );

    return callback(null, { ok: true });
  });
};
