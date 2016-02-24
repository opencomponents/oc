'use strict';

var async = require('async');
var colors = require('colors/safe');
var format = require('stringformat');
var path = require('path');
var read = require('read');
var semver = require('semver');
var _ = require('underscore');

var strings = require('../../resources/index');

module.exports = function(dependencies){

  var registry = dependencies.registry,
      local = dependencies.local,
      logger = dependencies.logger;

  var log = {
    err: function(msg){ return logger.log(colors.red(msg)); },
    ok: function(msg){ return logger.log(colors.green(msg)); },
    warn: function(msg){ return logger.log(colors.yellow(msg)); }
  };

  return function(opts, callback){

    callback = callback || _.noop;

    var componentPath = opts.componentPath,
        packageDir = path.resolve(componentPath, '_package'),
        compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    var getCredentials = function(cb){
      if(opts.username && opts.password){
        log.ok(strings.messages.cli.USING_CREDS);
        return cb(null, _.pick(opts, 'username', 'password'));
      }

      log.warn(strings.messages.cli.ENTER_USERNAME);

      read({}, function(err, username){
        log.warn(strings.messages.cli.ENTER_PASSWORD);

        read({ silent: true }, function(err, password){
          cb(null, { username: username, password: password});
        });
      });
    };

    var packageAndCompress = function(cb){
      log.warn(format(strings.messages.cli.PACKAGING, packageDir));

      local.package(componentPath, function(err, component){
        if(err){ return cb(err); }

        log.warn(format(strings.messages.cli.COMPRESSING, compressedPackagePath));

        local.compress(packageDir, compressedPackagePath, function(err){
          if(err){ return cb(err); }
          cb(null, component);
        });
      });
    };

    var putComponentToRegistry = function(options, cb){
      log.warn(format(strings.messages.cli.PUBLISHING, options.route));

      registry.putComponent(options, function(err, res){

        if(!!err){
          if(err === 'Unauthorized'){
            if(!!options.username || !!options.password){
              log.err(format(strings.errors.cli.PUBLISHING_FAIL, strings.errors.cli.INVALID_CREDENTIALS));
              return cb(err);
            }

            log.warn(strings.messages.cli.REGISTRY_CREDENTIALS_REQUIRED);

            return getCredentials(function(err, credentials){
              putComponentToRegistry(_.extend(options, credentials), cb);
            });

          } else if(err.code === 'cli_version_not_valid') {
            var upgradeCommand = format(strings.commands.cli.UPGRADE, err.details.suggestedVersion),
                errorDetails = format(strings.errors.cli.OC_CLI_VERSION_NEEDS_UPGRADE, colors.blue(upgradeCommand));

            log.err(format(strings.errors.cli.PUBLISHING_FAIL, errorDetails));
            return cb();
          } else if(err.code === 'node_version_not_valid') {
            var details = format(strings.errors.cli.NODE_CLI_VERSION_NEEDS_UPGRADE, err.details.suggestedVersion);

            log.err(format(strings.errors.cli.PUBLISHING_FAIL, details));
            return cb();
          } else {
            log.err(format(strings.errors.cli.PUBLISHING_FAIL, err));
            return cb();
          }
        } else {
          log.ok(format(strings.messages.cli.PUBLISHED, options.route.green));
          return cb();
        }
      });
    };

    registry.get(function(err, registryLocations){
      if(err){
        return log.err(err);
      }

      packageAndCompress(function(err, component){
        if(err){
          return log.err(format(strings.errors.cli.PACKAGE_CREATION_FAIL, err));
        }

        async.eachSeries(registryLocations, function(l, next){
          var registryUrl = l,
              registryLength = registryUrl.length,
              registryNormalised = registryUrl.slice(registryLength - 1) === '/' ? registryUrl.slice(0, registryLength - 1) : registryUrl,
              componentRoute = format('{0}/{1}/{2}', registryNormalised, component.name, component.version);

          putComponentToRegistry({ route: componentRoute, path: compressedPackagePath}, next);
        }, function(err){
          local.cleanup(compressedPackagePath, callback);
        });
      });
    });
  };
};
