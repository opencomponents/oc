'use strict';

var colors = require('colors');
var format = require('stringformat');
var strings = require(__BASE + '/resources/index');

module.exports = function(dependencies){

  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){
    local.mock(opts, function(err, res){
      return logger.log(format(strings.messages.cli.MOCKED_PLUGIN, opts.targetName, opts.targetValue).green);
    });
  };
};