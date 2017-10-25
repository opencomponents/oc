'use strict';

const path = require('path');
const spawn = require('cross-spawn');

const buildInstallCommand = options => {
  const args = ['install', '--prefix', options.installPath];

  if (options.save) {
    args.push('--save-exact');
    args.push(options.isDev ? '--save-dev' : '--save');
  }

  return args;
};

const executeCommand = (options, callback) => {
  const cmd = spawn('npm', [...options.command, '--no-package-lock'], {
    cwd: options.path,
    stdio: options.silent ? 'ignore' : 'inherit'
  });

  cmd.on('error', () => callback('error'));
  cmd.on('close', code => callback(code !== 0 ? code : null));
};

const moduleName = dependency => dependency.split('@')[0];

const getFullPath = ({ installPath, dependency }) =>
  path.join(installPath, 'node_modules', moduleName(dependency));

module.exports = {
  init: (options, callback) => {
    const { initPath, silent } = options;
    const npminit = ['init', '--yes'];
    const cmdOptions = { path: initPath, command: npminit, silent };

    executeCommand(cmdOptions, callback);
  },
  installDependencies: (options, callback) => {
    const { dependencies, installPath, silent } = options;
    const npmi = buildInstallCommand(options);
    const cmdOptions = {
      command: [...npmi, ...dependencies],
      path: installPath,
      silent
    };

    const dest = dependencies.map(dependency =>
      getFullPath({ installPath, dependency })
    );

    executeCommand(cmdOptions, err => callback(err, err ? null : { dest }));
  },
  installDependency: (options, callback) => {
    const { dependency, installPath, silent } = options;
    const npmi = buildInstallCommand(options);
    const cmdOptions = {
      command: [...npmi, dependency],
      path: installPath,
      silent
    };
    const dest = getFullPath({ installPath, dependency });

    executeCommand(cmdOptions, err => callback(err, err ? null : { dest }));
  }
};
