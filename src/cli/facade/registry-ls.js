'use strict';

const colors = require('colors/safe');
const format = require('stringformat');
const _ = require('underscore');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){
  
  let registry = dependencies.registry,
      logger = dependencies.logger;

  const log = {
    err: function(msg){ return logger.log(colors.red(msg)); },
    ok: function(msg){ return logger.log(colors.green(msg)); },
    warn: function(msg){ return logger.log(colors.yellow(msg)); }
  };

  return function(opts, callback){

    callback = wrapCliCallback(callback);
    
    registry.get(function(err, registries){
      if(err){
        log.err(format(strings.errors.generic, err));
        return callback(err);
      } else {
        log.warn(strings.messages.cli.REGISTRY_LIST);

        if(registries.length === 0){
          err = strings.errors.cli.REGISTRY_NOT_FOUND;
          log.err(err);
          return callback(err);
        }

        _.forEach(registries, function(registryLocation){
          log.ok(registryLocation);       
        });

        callback(null, registries);
      }
    });
  };
};