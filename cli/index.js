'use strict';

var cli = require('nomnom');
var _ = require('underscore');

var autocomplete = require('./autocomplete');
var commands = require('./commands');
var Local = require('./domain/local');
var Registry = require('./domain/registry');
var strings = require('../resources');

var dependencies = {
  local: new Local(),
  logger: {
    log: console.log,
    logNoNewLine: function(msg){
      return process.stdout.write(msg.toString());
    }
  },
  registry: new Registry()
};

autocomplete.init(_.keys(commands.oc));

cli.option('completion', {
  hidden: true,
  callback: autocomplete.setup,
  flag: true
});

_.forEach(commands, function(commandsConfiguration, commandsConfigurationName){

  cli.script(commandsConfigurationName);

  _.forEach(commandsConfiguration, function(command, commandName){

    var facade = require('./facade/' + commandName)(dependencies),
        cliCommand = cli.command(commandName).help(command.help).callback(facade),
        c;

    if(!!command.options){
      c = 0;
      cliCommand.options(_.object(_.keys(command.options), _.map(command.options, function(option){
        c++;
        return _.extend(option, {
          list: false,
          position: c,
          required: (option.required === false) ? false : true
        });
      })));
    }

  });
});

cli.help(strings.messages.cli.HELP_HINT).parse();
