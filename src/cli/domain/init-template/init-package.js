'use strict';

const spawn = require('cross-spawn');

module.exports = function(options) {
  const { cli, componentPath } = options;
  spawn.sync(cli, ['init', '--yes'], { cwd: componentPath });
};
