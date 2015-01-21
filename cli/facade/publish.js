'use strict';

var colors = require('colors');
var format = require('../../utils/format');
var path = require('path');
var strings = require('../../resources/index');
var _ = require('underscore');

module.exports = function(dependencies){
  
  var registry = dependencies.registry,
      local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){

    var componentPath = opts.componentPath,
        packageDir = path.resolve(componentPath, '_package'),
        compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    var packageAndCompress = function(callback){
      
      logger.log(format(strings.messages.cli.PACKAGING.yellow, packageDir.green));
      
      local.package(componentPath, function(err, component){
        if(err){
          return callback(err);
        }

        logger.log(format(strings.messages.cli.COMPRESSING.yellow, compressedPackagePath.green));

        local.compress(packageDir, compressedPackagePath, function(err){
          if(err){
            return callback(err);
          }

          callback(null, component);
        });
      });
    };

    registry.get(function(err, registryLocations){
      if(err){
        return logger.log(err.red);
      }

      packageAndCompress(function(err, component){
        if(err){
          return logger.log(format(strings.errors.cli.PACKAGING_FAIL, err).red);
        }

        var registryRoute = format('{0}/{1}/{2}', registryLocations[0], component.name, component.version);

        logger.log(format(strings.messages.cli.PUBLISHING.yellow, registryRoute.green));

        registry.putComponent(registryRoute, compressedPackagePath, function(err, res){

          if(!!err){
            logger.log(format(strings.errors.cli.PUBLISHING_FAIL, err).red);
          } else {
            logger.log('Component published -> '.yellow + registryRoute.green);
            local.cleanup(compressedPackagePath, process.exit);
          }
        });
      });
    });
  };
};