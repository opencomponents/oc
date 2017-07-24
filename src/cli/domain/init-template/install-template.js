'use strict';

const path = require('path');
const spawn = require('cross-spawn');
const _ = require('lodash');

const strings = require('../../../resources');

module.exports = function installTemplate(options, callback) {
  const {
    componentName,
    templateType,
    compiler,
    componentPath,
    logger
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
    const version = require(path.join(
      componentPath,
      'node_modules',
      compiler
    )).getInfo().version;
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
