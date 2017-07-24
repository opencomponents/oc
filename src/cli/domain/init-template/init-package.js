'use strict';

const spawn = require('cross-spawn');

module.exports = function({ componentPath }) {
  spawn.sync('npm', ['init', '--yes'], { cwd: componentPath });
};
