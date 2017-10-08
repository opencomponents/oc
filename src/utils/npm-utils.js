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
  const cmd = spawn('npm', options.command, {
    cwd: options.installPath,
    stdio: 'inherit'
  });

  cmd.on('error', () => callback('error'));
  cmd.on('close', code => callback(code !== 0 ? code : null));
};

const moduleName = dependency => dependency.split('@')[0];

module.exports = {
  installDependencies: (options, callback) => {
    const { dependencies, installPath } = options;
    const npmi = buildInstallCommand(options);
    const cmdOptions = { installPath, command: [...npmi, ...dependencies] };

    executeCommand(cmdOptions, err =>
      callback(
        err,
        err
          ? null
          : {
            dest: dependencies.map(dependency =>
              path.join(installPath, 'node_modules', moduleName(dependency))
            )
          }
      )
    );
  },
  installDependency: (options, callback) => {
    const { dependency, installPath } = options;
    const npmi = buildInstallCommand(options);
    const cmdOptions = { installPath, command: [...npmi, dependency] };

    executeCommand(cmdOptions, err =>
      callback(
        err,
        err
          ? null
          : {
            dest: path.join(
              installPath,
              'node_modules',
              moduleName(dependency)
            )
          }
      )
    );
  }
};
