'use strict';

const path = require('path');
const spawn = require('cross-spawn');
const _ = require('lodash');

const isValidTemplate = require('../../../utils/isValidTemplate');
const strings = require('../../../resources');

module.exports = function installTemplate(options, callback) {
  const {
    compiler,
    componentName,
    componentPath,
    logger,
    templateType
  } = options;

  logger.log(strings.messages.cli.installCompiler(compiler));

  const args = ['install', '--save-dev', '--save-exact', compiler];
  const installProc = spawn('npm', args, {
    cwd: componentPath,
    stdio: 'inherit'
  });

  installProc.on('error', () => callback('template type not valid'));
  installProc.on('close', code => {
    if (code !== 0) {
      return callback('template type not valid');
    }
    const maybeCompiler = require(path.join(
      componentPath,
      'node_modules',
      compiler
    ));

    if (!isValidTemplate(maybeCompiler, { compiler: true })) {
      return callback('template type not valid');
    }
    const version = maybeCompiler.getInfo().version;
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
