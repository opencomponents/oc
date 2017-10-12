'use strict';

const tryRequire = require('try-require');

const isTemplateValid = require('../../../utils/is-template-valid');
const npm = require('../../../utils/npm-utils');
const strings = require('../../../resources');

module.exports = function installTemplate(options, callback) {
  const { compiler, componentPath, logger, templateType } = options;

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

    if (!isTemplateValid(installedCompiler, { compiler: true })) {
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
