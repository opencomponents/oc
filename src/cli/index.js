'use strict';

var cli = require('yargs');
var _ = require('underscore');

var commands = require('./commands');
var format = require('stringformat');
var Local = require('./domain/local');
var logger = require('./logger');
var Registry = require('./domain/registry');
var strings = require('../resources');

var dependencies = {
  local: new Local(),
  logger: logger,
  registry: new Registry()
};

function validate(argv, level){
  if(argv._.length > level &&
    !_.contains(_.keys(commands.commands), argv._[level])) {
    throw new Error(format(strings.messages.cli.NO_SUCH_COMMAND, argv._[level]));
  }

  return true;
}

function processCommand(command, commandName, cli, level, prefix){
  prefix = prefix || '';
  level = (level || 0) + 1;
  var facade = require('./facade/' + prefix + commandName)(dependencies);

  cli
    .command(
      command.cmd || commandName,
      command.description,
      function(yargs){
        yargs.usage(command.usage);

        if(!!command.options){
          yargs.options(command.options);
        }

        if(!!command.commands){
          yargs
            .check(function(argv){
              return validate(argv, level);
            })
            .epilogue(strings.messages.cli.HELP_HINT);
          var newPrefix = (!!prefix ? prefix + '-' : '') + commandName + '-';
          _.mapObject(command.commands, function(commandConfiguration, commandName){
            processCommand(commandConfiguration, commandName, yargs, level, newPrefix);
          });
        }

        if(!!command.example){
          yargs
            .example(
              command.example.cmd,
              command.example.description);
        }

        return yargs;
      }, facade
    );
}

_.forEach(commands.commands, function(command, commandName) {
  processCommand(command, commandName, cli);
});

var argv = cli
  .completion()
  .check(function(argv){
    return validate(argv, 0);
  })
  .usage(commands.usage)
  .epilogue(strings.messages.cli.HELP_HINT)
  .help('h')
  .alias('h', 'help')
  .version()
  .wrap(cli.terminalWidth())
  .argv;

if(argv._.length === 0 ) {
  cli.showHelp();
}
