'use strict';

var colors = require('colors/safe');
var format = require('stringformat');
var _ = require('underscore');

var strings = require('../../resources/index');

module.exports = function(dependencies){
  
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts, callback){

    callback = callback || _.noop;

    local.mock(opts, function(err, res){
      logger.log(colors.green(format(strings.messages.cli.MOCKED_PLUGIN, opts.targetName, opts.targetValue)));
      callback(err, res);
    });
  };
};