'use strict';

var async = require('async');
var colors = require('colors');
var format = require('stringformat');
var path = require('path');
var read = require('read');
var _ = require('underscore');

var strings = require('../../resources/index');

module.exports = function(dependencies){

  var registry = dependencies.registry,
      local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){

    var componentPath = opts.componentPath,
        packageDir = path.resolve(componentPath, '_package'),
        compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    var getCredentials = function(callback){

      logger.log(strings.messages.cli.ENTER_USERNAME.yellow);

      read({}, function(err, username){

        logger.log(strings.messages.cli.ENTER_PASSWORD.yellow);

        read({ silent: true }, function(err, password){
          callback(null, { username: username, password: password});
        });
      });
    };

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

    var putComponentToRegistry = function(options, callback){

      logger.log(format(strings.messages.cli.PUBLISHING.yellow, options.route.green));

      registry.putComponent(options, function(err, res){

        if(!!err){

          if(err === 'Unauthorized'){
            if(!!options.username || !!options.password){
              logger.log(format(strings.errors.cli.PUBLISHING_FAIL, strings.errors.cli.INVALID_CREDENTIALS).red);
              return callback(err);
            }

            logger.log(strings.messages.cli.REGISTRY_CREDENTIALS_REQUIRED.yellow);

            return getCredentials(function(err, credentials){
              putComponentToRegistry(_.extend(options, {
                username: credentials.username,
                password: credentials.password
              }), callback);
            });

          } else {
            logger.log(format(strings.errors.cli.PUBLISHING_FAIL, err).red);
            return callback();
          }
        } else {
          logger.log(format(strings.messages.cli.PUBLISHED, options.route.green).yellow);
          return local.cleanup(options.path, callback);
        }
      });
    };

    registry.get(function(err, registryLocations){
      if(err){
        return logger.log(err.red);
      }

      packageAndCompress(function(err, component){
        if(err){
          return logger.log(format(strings.errors.cli.PACKAGE_CREATION_FAIL, err).red);
        }

        async.eachSeries(registryLocations, function(l, done){
          var registryUrl = l,
              registryLength = registryUrl.length,
              registryNormalised = registryUrl.slice(registryLength - 1) === '/' ? registryUrl.slice(0, registryLength - 1) : registryUrl,
              componentRoute = format('{0}/{1}/{2}', registryNormalised, component.name, component.version);

          putComponentToRegistry({ route: componentRoute, path: compressedPackagePath}, done);
        }, function(err){});
      });
    });
  };
};
