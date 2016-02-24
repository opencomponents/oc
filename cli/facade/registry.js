'use strict';

var colors = require('colors/safe');
var format = require('stringformat');
var _ = require('underscore');

var strings = require('../../resources/index');

module.exports = function(dependencies){
  
  var registry = dependencies.registry,
      logger = dependencies.logger;

  var log = {
    err: function(msg){ return logger.log(colors.red(msg)); },
    ok: function(msg){ return logger.log(colors.green(msg)); },
    warn: function(msg){ return logger.log(colors.yellow(msg)); }
  };

  return function(opts){
    if(opts.command === 'ls'){
      registry.get(function(err, registries){
        if(err){
          return log.err(format(strings.errors.generic, err));
        } else {
          log.warn(strings.messages.cli.REGISTRY_LIST);

          if(registries.length === 0){
            log.err(strings.errors.cli.REGISTRY_NOT_FOUND);
          }

          _.forEach(registries, function(registryLocation){
            log.ok(registryLocation);       
          });
        }
      });
    } else if(opts.command === 'add'){
      registry.add(opts.parameter, function(err, res){
        return err ? log.err(err) : log.ok(strings.messages.cli.REGISTRY_ADDED);
      });
    } else if(opts.command === 'remove'){
      registry.remove(opts.parameter, function(err, res){
        return err ? log.err(err) : log.ok(strings.messages.cli.REGISTRY_REMOVED);
      });
    }
  };
};