'use strict';

const _ = require('lodash');
const commands = require('./commands').default;
const strings = require('../resources').default;

const validateCommand = (argv, level) => {
  let keys = Object.keys(commands.commands);
  if (level === 1) {
    keys = Object.keys(commands.commands[argv._[0]].commands);
  }

  if (argv._.length > level && !_.includes(keys, argv._[level])) {
    throw new Error(strings.messages.cli.NO_SUCH_COMMAND(argv._[level]));
  }
  return true;
};

module.exports = validateCommand;
