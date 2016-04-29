'use strict';

var _ = require('underscore');

var commands = require('../../src/cli/commands');

module.exports = {
  parse: function(){

    var commandList = '',
        detailedCommandList = '';

    _.forEach(commands.oc, function(command, commandName){
      commandList += commandName + ' - ' + command.help + '\n';
      detailedCommandList += '\n##' + commandName + '\n' + command.help + '\n\nUsage:\n```sh\noc ' + commandName;
      if(!!command.options){
        _.forEach(command.options, function(option, optionName){
          if(option.required === false){
            detailedCommandList += ' [' + optionName + ']';
          } else {
            detailedCommandList += ' <' + optionName + '>';
          }
        });
      }

      detailedCommandList += '\n```\n';

      if(!!command.options){
        detailedCommandList += '\n\nParameters:\n\n|Name|Description|Choices|\n|----|-----------|-------|\n';
        _.forEach(command.options, function(option, optionName){
          detailedCommandList += '|' + optionName + '|' + option.help + '|' + (option.choices || '') + '|\n';
        });
      }
    });

    return {
      commandList: commandList,
      detailedCommandList: detailedCommandList
    };
  }
};
