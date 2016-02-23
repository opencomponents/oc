'use strict';

var colors = require('colors/safe');
var format = require('stringformat');
var _ = require('underscore');

var strings = require('../../resources/index');

module.exports = function(dependencies){
  
  var registry = dependencies.registry,
      logger = dependencies.logger;

  var exit = function(msg){
    logger.log(colors.red(msg));
    return process.exit(1);
  };

  var ok = function(msg){
    return logger.log(colors.green(msg));
  };

  return function(opts){
    if(opts.command === 'ls'){
      registry.get(function(err, registries){
        if(err){
          return exit(format(strings.errors.generic, err));
        } else {
          logger.log(colors.yellow(strings.messages.cli.REGISTRY_LIST));

          if(_.isEmpty(registries)){
            return exit(strings.errors.cli.REGISTRY_NOT_FOUND);
          }

          _.forEach(registries, function(registryLocation){
            ok(registryLocation);       
          });
        }
      });
    } else if(opts.command === 'add'){
      registry.add(opts.parameter, function(err, res){
        if(err){ return exit(err); }
        ok(strings.messages.cli.REGISTRY_ADDED);
      });
    } else if(opts.command === 'remove'){
      registry.remove(opts.parameter, function(err, res){
        if(err){ return exit(err); }
        return ok(strings.messages.cli.REGISTRY_REMOVED);
      });
    }
  };
};