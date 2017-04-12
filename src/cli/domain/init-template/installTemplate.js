'use strict';

const Spinner = require('cli-spinner').Spinner;
const spawn = require('cross-spawn');
const colors = require('colors/safe');

module.exports = function installTemplate(config, callback) {
  const templateType = config.templateType;
  const cli = config.cli;
  const componentPath = config.componentPath;
  const local = config.local;
  const packageName = config.packageName;
  const logger = config.logger;

  const installing = new Spinner(`Installing ${packageName} from ${local ? 'local' : 'npm'}...`);
  installing.start();

  const args = {
    npm: [
      'install',
      '--save',
      '--save-exact',
      templateType
    ]
  };

  const installProc = spawn(cli, args[cli], {silent: true, cwd: componentPath});

  installProc.on('error', () => callback('template type not valid'));
  installProc.on('close', code => {
    if (code !== 0) {
      return callback('template type not valid');
    }
    installing.stop(true);
    logger.log(
      `${colors.green('✔')} Installed ${packageName} from ${local ? templateType : 'npm'}`
    );
    return callback(config);
  });
};