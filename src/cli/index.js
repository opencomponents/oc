'use strict';

const cli = require('yargs');
const commands = require('./commands');
const format = require('stringformat');
const semver = require('semver');
const _ = require('lodash');

const Local = require('./domain/local');
const logger = require('./logger');
const Registry = require('./domain/registry');
const strings = require('../resources');
const validateCommand = require('./validate-command');

const currentNodeVersion = process.version;
const minSupportedVersion = '6.0.0';
if (semver.lt(currentNodeVersion, minSupportedVersion)) {
  logger.err(
    format(
      strings.errors.cli.NODE_CLI_VERSION_UNSUPPORTED,
      currentNodeVersion,
      minSupportedVersion
    )
  );
}

const dependencies = {
  local: new Local(),
  logger,
  registry: new Registry()
};

function processCommand(command, commandName, cli, level, prefix) {
  prefix = prefix || '';
  level = (level || 0) + 1;
  const facade = require(`./facade/${prefix}${commandName}`)(dependencies);

  cli.command(
    command.cmd || commandName,
    command.description,
    yargs => {
      yargs.usage(command.usage);

      if (command.options) {
        yargs.options(command.options);
      }

      if (command.commands) {
        yargs
          .check(argv => validateCommand(argv, level))
          .epilogue(strings.messages.cli.HELP_HINT);

        const newPrefix = (prefix ? prefix + '-' : '') + commandName + '-';

        _.mapValues(command.commands, (commandConfiguration, commandName) => {
          processCommand(
            commandConfiguration,
            commandName,
            yargs,
            level,
            newPrefix
          );
        });
      }

      if (command.example) {
        yargs.example(command.example.cmd, command.example.description);
      }

      return yargs;
    },
    facade
  );
}

_.forEach(commands.commands, (command, commandName) => {
  processCommand(command, commandName, cli);
});

const argv = cli
  .completion()
  .check(argv => validateCommand(argv, 0))
  .usage(commands.usage)
  .epilogue(strings.messages.cli.HELP_HINT)
  .help('h')
  .alias('h', 'help')
  .version()
  .wrap(cli.terminalWidth()).argv;

if (argv._.length === 0) {
  cli.showHelp();
}
