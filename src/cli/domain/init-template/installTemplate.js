'use strict';

const Spinner = require('cli-spinner').Spinner;
const spawn = require('cross-spawn');
const colors = require('colors/safe');
const path = require('path');

module.exports = function installTemplate(config, blueprint) {
  const templateType = config.templateType;
  const cli = config.cli;
  const componentPath = config.componentPath;
  const local = config.local;
  const packageName = config.packageName;
  const logger = config.logger;
  const callback = config.callback;
  const installPath = path.resolve(componentPath, '../');

  const installing = new Spinner(`🚚  Installing ${packageName} from ${local ? 'local' : 'npm'}...`);
  installing.start();

  const args = {
    npm: [
      'install',
      '--save',
      '--save-exact',
      local ? path.resolve(process.cwd(), templateType) : templateType,
    ]
  };
 
  const installProc = spawn(cli, args[cli], {silent: true, cwd: installPath});

  installProc.on('error', () => callback('template type not valid'));
  installProc.on('close', code => {
    if (code !== 0) {
      return callback('template type not valid');
    }
    installing.stop(true);
    logger.log(
      `${colors.green('✔')} Installed ${packageName} from ${local ? templateType : 'npm'}`
    );

    // install devDependencies
    const installedTemplatePath = path.resolve(installPath, 'node_modules', templateType)
    logger.log(
      `🚚  Installing required devDependencies`
    );

    const installDevDeps = spawn(cli, ['install'], {stdio: 'inherit', silent: true, cwd: installedTemplatePath});

    installDevDeps.on('close', code => {
      if (code !== 0) {
        return callback('template type not valid');
      }
      logger.log(
        `${colors.green('✔')} Installed ${packageName}'s devDependencies`
      );
      return blueprint(config);
    })
  });
};
