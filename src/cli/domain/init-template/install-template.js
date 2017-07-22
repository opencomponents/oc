'use strict';

const Spinner = require('cli-spinner').Spinner;
const spawn = require('cross-spawn');
const path = require('path');
const _ = require('lodash');
const process = require('process');
const strings = require('../../../resources');

module.exports = function installTemplate(options, scaffold) {
  const {
    componentName,
    templateType,
    compiler,
    cli,
    componentPath,
    local,
    template,
    logger,
    callback
  } = options;

  const installing = new Spinner(
    strings.messages.cli.installCompiler(compiler, local)
  );
  installing.start();

  const args = {
    npm: [
      'install',
      '--save-dev',
      '--save-exact',
      local ? path.resolve(process.cwd(), templateType) : compiler
    ]
  };

  const installProc = spawn(cli, args[cli], { cwd: componentPath });

  installProc.on('error', () => callback('template type not valid'));
  installProc.on('close', code => {
    if (code !== 0) {
      return callback('template type not valid');
    }
    installing.stop(true);
    const compilerPath = local
      ? path.resolve(process.cwd(), templateType)
      : path.join(componentPath, 'node_modules', compiler);
    const version = require(compilerPath).getInfo().version;
    logger.log(
      strings.messages.cli.installCompilerSuccess(template, compiler, version)
    );

    return scaffold({
      compiler,
      componentName,
      componentPath,
      compilerPath,
      logger,
      callback
    });
  });
};
