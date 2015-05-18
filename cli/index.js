'use strict';

var cli = require('nomnom');
var commands = require('./commands');
var Local = require('./domain/local');
var omelette = require('omelette');
var Registry = require('./domain/registry');
var _ = require('underscore');

var dependencies = {
  local: new Local(),
  logger: console,
  registry: new Registry()
};

var complete = omelette('oc <action>');

complete.on('action', function(fragment, word, line){
  this.reply(Object.getOwnPropertyNames(commands.oc).sort());
});

complete.init();

var setup = function(){
  complete.setupShellInitFile();
};

cli.option('completion', {
  hidden: true,
  callback: setup,
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

cli.parse();
