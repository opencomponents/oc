'use strict';

var autocomplete = require('./autocomplete');
var cli = require('nomnom');
var commands = require(__BASE + '/cli/commands');
var Local = require(__BASE + '/cli/domain/local');
var Registry = require(__BASE + '/cli/domain/registry');
var strings = require(__BASE + '/resources');
var _ = require('underscore');

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

    var facade = require(__BASE + '/cli/facade/' + commandName)(dependencies),
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
