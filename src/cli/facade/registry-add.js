'use strict';

var colors = require('colors/safe');

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

    callback = wrapCliCallback(callback);
    
    registry.add(opts.registryUrl, function(err){
      if(err){
        log.err(err);
        return callback(err);
      }

      log.ok(strings.messages.cli.REGISTRY_ADDED);
      callback(null, 'ok');
    });
  };
};