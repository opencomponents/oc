'use strict';

const spawn = require('cross-spawn');

module.exports = function(config){
  const cli = config.cli;
  const componentPath = config.componentPath;

  spawn.sync(cli, ['init', '--yes'], { silent: true, cwd: componentPath });
};
