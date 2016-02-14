'use strict';

var async = require('async');
var colors = require('colors/safe');
var format = require('stringformat');
var path = require('path');
var semver = require('semver');
var _ = require('underscore');

var readCredentials = require('../domain/read-credentials');
var strings = require('../../resources/index');

module.exports = function(dependencies){

  var registry = dependencies.registry,
      local = dependencies.local,
      logger = dependencies.logger;

  return function(opts, callback){

    callback = callback || _.noop;

    var componentPath = opts.componentPath,
        packageDir = path.resolve(componentPath, '_package'),
        compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    var getCredentials = function(cb){
      if(opts.username && opts.password){
        logger.log(colors.green(strings.messages.cli.USING_CREDS));
        return cb(null, _.pick(opts, 'username', 'password'));
      } else {
        readCredentials(logger, cb);
      }
    };

    var packageAndCompress = function(cb){
      logger.log(format(colors.yellow(strings.messages.cli.PACKAGING), colors.green(packageDir)));

      local.package(componentPath, function(err, component){
        if(err){ return cb(err); }

        logger.log(format(colors.yellow(strings.messages.cli.COMPRESSING), colors.green(compressedPackagePath)));
        local.compress(packageDir, compressedPackagePath, function(err){
          if(err){ return cb(err); }
          cb(null, component);
        });
      });
    };

    var putComponentToRegistry = function(options, cb){
      logger.log(format(colors.yellow(strings.messages.cli.PUBLISHING), colors.green(options.route)));

      registry.putComponent(options, function(err, res){

        if(!!err){
          if(err === 'Unauthorized'){
            if(!!options.username || !!options.password){
              return cb(format(strings.errors.cli.PUBLISHING_FAIL, strings.errors.cli.INVALID_CREDENTIALS));
            }

            logger.log(colors.yellow(strings.messages.cli.REGISTRY_CREDENTIALS_REQUIRED));

            return getCredentials(function(err, credentials){
              putComponentToRegistry(_.extend(options, {
                username: credentials.username,
                password: credentials.password
              }), cb);
            });

          } else if(err.code === 'cli_version_not_valid') {
            var upgradeCommand = colors.blue(format(strings.commands.cli.UPGRADE, err.details.suggestedVersion)),
                errorDetails = format(strings.errors.cli.OC_CLI_VERSION_NEEDS_UPGRADE, upgradeCommand);
            return cb(format(strings.errors.cli.PUBLISHING_FAIL, errorDetails));
          } else if(err.code === 'node_version_not_valid') {
            var details = format(strings.errors.cli.NODE_CLI_VERSION_NEEDS_UPGRADE, err.details.suggestedVersion);
            return cb(format(strings.errors.cli.PUBLISHING_FAIL, details));
          } else {
            return cb(format(strings.errors.cli.PUBLISHING_FAIL, err));
          }
        } else {
          logger.log(colors.yellow(format(strings.messages.cli.PUBLISHED, colors.green(options.route))));
          return cb(null, 'ok');
        }
      });
    };

    registry.get(function(err, registryLocations){
      if(err){
        return logger.log(colors.red(err));
      }

      packageAndCompress(function(err, component){
        if(err){
          return logger.log(colors.red(format(strings.errors.cli.PACKAGE_CREATION_FAIL, err)));
        }

        async.eachSeries(registryLocations, function(l, cb){
          var registryUrl = l,
              registryLength = registryUrl.length,
              registryNormalised = registryUrl.slice(registryLength - 1) === '/' ? registryUrl.slice(0, registryLength - 1) : registryUrl,
              componentRoute = format('{0}/{1}/{2}', registryNormalised, component.name, component.version);

          putComponentToRegistry({ route: componentRoute, path: compressedPackagePath}, function(err, res){
            if(!!err){
              logger.log(colors.red(err));
            }
            cb();
          });
        }, function(err){
          local.cleanup(compressedPackagePath, callback);
        });
      });
    });
  };
};
