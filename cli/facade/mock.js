'use strict';

var colors = require('colors/safe');
var format = require('stringformat');

var strings = require('../../resources/index');
var wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){
  
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts, callback){

    callback = wrapCliCallback(callback);

    local.mock(opts, function(err, res){
      logger.log(colors.green(format(strings.messages.cli.MOCKED_PLUGIN, opts.targetName, opts.targetValue)));
      callback(err, res);
    });
  };
};