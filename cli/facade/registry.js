'use strict';

var colors = require('colors');
var format = require('../../utils/format');
var strings = require('../../resources/index');
var _ = require('underscore');

module.exports = function(dependencies){
  
  var registry = dependencies.registry,
      logger = dependencies.logger;

  return function(opts){
    if(opts.command === 'ls'){
      registry.get(function(err, registries){
        if(err){
          return logger.log(format(strings.errors.generic, err).red);
        } else {
          logger.log(strings.messages.cli.REGISTRY_LIST.yellow);

          if(registries.length === 0){
            logger.log(strings.errors.cli.REGISTRY_NOT_FOUND.red);
          }

          _.forEach(registries, function(registryLocation){
            logger.log(registryLocation.green);       
          });
        }
      });
    } else if(opts.command === 'add'){
      registry.add(opts.parameter, function(err, res){
        return logger.log(err ? err.red : strings.messages.cli.REGISTRY_ADDED.green);
      });
    } else if(opts.command === 'remove'){
      registry.remove(opts.parameter, function(err, res){
        return logger.log(err ? err.red : strings.messages.cli.REGISTRY_REMOVED.green);
      });
    }
  };
};