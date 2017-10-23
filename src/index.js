'use strict';

const _ = require('lodash');
const Local = require('./cli/domain/local');

function cliCommand(cmd, options, cb) {
  const dependencies = {
    local: new Local(),
    logger: options.logger || { log() {} }
  };
  const opts = _.omit(options, 'logger');

  require(`./cli/facade/${cmd}.js`)(dependencies)(opts, cb);
}

module.exports.cli = cliCommand;
module.exports.Client = require('oc-client');
module.exports.Registry = require('./registry');
