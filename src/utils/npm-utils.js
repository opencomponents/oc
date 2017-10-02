'use strict';

const path = require('path');
const spawn = require('cross-spawn');

module.exports = {
  installDependency: (options, callback) => {
    const { dependency, installPath, isDev, save } = options;

    const args = ['install'];

    if (save) {
      args.push('--save-exact');
      args.push(isDev ? '--save-dev' : '--save');
    }

    const cmd = spawn('npm', [...args, dependency], {
      cwd: installPath,
      stdio: 'inherit'
    });

    cmd.on('error', () => callback('error'));
    cmd.on('close', code => {
      const err = code !== 0 ? code : null;
      callback(
        err,
        err
          ? null
          : { dest: path.join(installPath, 'node_modules', dependency) }
      );
    });
  }
};
