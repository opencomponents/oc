'use strict';

const Spinner = require('cli-spinner').Spinner;
const spawn = require('cross-spawn');
const colors = require('colors/safe');
const path = require('path');
const _ = require('lodash');
const process = require('process');

module.exports = function installTemplate(config, blueprint) {
  const templateType = config.templateType;
  const cli = config.cli;
  const componentPath = config.componentPath;
  const local = config.local;
  const packageName = config.packageName;
  const logger = config.logger;
  const callback = config.callback;
  const installPath = path.resolve(componentPath, '../');

  const installing = new Spinner(`Installing ${packageName} from ${local ? 'local' : 'npm'}...`);
  installing.start();

  const args = {
    npm: [
      'install',
      '--save',
      '--save-exact',
      local ? path.resolve(process.cwd(), templateType) : templateType,
    ]
  };

  const installProc = spawn(cli, args[cli], {stdio: 'inherit', silent: true, cwd: installPath});

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
    const installedTemplatePath = path.resolve(installPath, 'node_modules', packageName);
    const compileDependencies = require(path.join(installedTemplatePath, 'package.json')).compileDependencies;

    logger.log(
      `Installing required dependencies to compile ${packageName} components...`
    );

    const modulesToInstall = _.keys(compileDependencies).map((name) => {
      const version = compileDependencies[name];
      const depToInstall = version.length > 0 ? `${name}@${version}` : name;
      return depToInstall;
    });

    const args = ["install"].concat(modulesToInstall);
    const installCompileDependencies = spawn(cli, args, {stdio: 'inherit', silent: true, cwd: installedTemplatePath});

    installCompileDependencies.on('close', code => {
      if (code !== 0) {
        return callback('template type not valid');
      }
      logger.log(
        `${colors.green('✔')} Installed required dependencies to compile ${packageName} components`
      );
      return blueprint(config);
    });
  });
};
