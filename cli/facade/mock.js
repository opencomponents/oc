'use strict';

var colors = require('colors/safe');
var format = require('stringformat');

var strings = require('../../resources/index');

module.exports = function(dependencies){
  
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){
    local.mock(opts, function(err, res){
      return logger.log(colors.green(format(strings.messages.cli.MOCKED_PLUGIN, opts.targetName, opts.targetValue)));
    });
  };
};