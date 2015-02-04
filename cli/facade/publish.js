'use strict';

var colors = require('colors');
var format = require('../../utils/format');
var path = require('path');
var read = require('read');
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

    var putComponentToRegistry = function(options){

      logger.log(format(strings.messages.cli.PUBLISHING.yellow, options.route.green));

      registry.putComponent(options, function(err, res){

        if(!!err){

          if(err === 'Unauthorized'){
            if(!!options.username || !!options.password){
              return logger.log('Invalid credentials'.red);
            }
            
            logger.log('Registry requires credentials. Enter your username: '.yellow);

            read({}, function(err, username){

              logger.log('Enter your password: '.yellow);
              
              read({ silent: true }, function(err, password){
                putComponentToRegistry(_.extend(options, {
                  username: username,
                  password: password
                }));
              });
            });
          } else {
            logger.log(format(strings.errors.cli.PUBLISHING_FAIL, err).red);
          }
        } else {
          logger.log('Component published -> '.yellow + options.route.green);
          local.cleanup(compressedPackagePath, process.exit);
        }
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

        var registryUrl = registryLocations[0],
            registryLength = registryUrl.length,
            registryNormalised = registryUrl.slice(registryLength - 1) === '/' ? registryUrl.slice(0, registryLength - 1) : registryUrl,
            componentRoute = format('{0}/{1}/{2}', registryNormalised, component.name, component.version);

        putComponentToRegistry({ route: componentRoute, path: compressedPackagePath});
      });
    });
  };
};