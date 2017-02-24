'use strict';

var colors = require('colors/safe');
var format = require('stringformat');
var _ = require('underscore');

var strings = require('../../resources/index');
var wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){
  
  var registry = dependencies.registry,
      logger = dependencies.logger;

  var log = {
    err: function(msg){ return logger.log(colors.red(msg)); },
    ok: function(msg){ return logger.log(colors.green(msg)); },
    warn: function(msg){ return logger.log(colors.yellow(msg)); }
  };

  return function(opts, callback){

    console.log('hello, I`m removing');

    callback = wrapCliCallback(callback);
    
    registry.remove(opts.registryUrl, function(err, res){
      if(err){
        log.err(err);
        return callback(err);
      }

      log.ok(strings.messages.cli.REGISTRY_REMOVED);
      callback(null, 'ok');
    });
  };
};