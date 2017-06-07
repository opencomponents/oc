'use strict';

const _ = require('lodash');
const format = require('stringformat');
const commands = require('./commands');
const strings = require('../resources');

const validateCommand = (argv, level) => {
  let keys = _.keys(commands.commands);
  if (level === 1) {
    keys = _.keys(commands.commands[argv._[0]].commands);
  }

  if (argv._.length > level && !_.includes(keys, argv._[level])) {
    throw new Error(
      format(strings.messages.cli.NO_SUCH_COMMAND, argv._[level])
    );
  }
  return true;
};

module.exports = validateCommand;
