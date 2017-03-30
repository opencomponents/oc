'use strict';

var strings = require('../../resources/index');
var wrapCliCallback = require('../wrap-cli-callback');
var colors = require('colors/safe');
var format = require('stringformat');
var path = require('path');

module.exports = function(dependencies) {
  var local = dependencies.local,
      logger = dependencies.logger;

  var log = {
    err: function(msg){ return logger.log(colors.red(msg)); },
    ok: function(msg){ return logger.log(colors.green(msg)); },
    warn: function(msg){ return logger.log(colors.yellow(msg)); }
  };

  return function(opts, callback) {
    var componentPath = opts.componentPath,
        packageDir = path.resolve(componentPath, '_package'),
        compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    callback = wrapCliCallback(callback);

    log.warn(format(strings.messages.cli.PACKAGING, packageDir));
    var packageOptions = {
      componentPath: path.resolve(componentPath)
    };
    local.package(packageOptions, function(err, component){
      if(err){
        log.err(format(strings.errors.cli.PACKAGE_CREATION_FAIL, err)); 
        return callback(err); 
      }

      log.ok(format(strings.messages.cli.PACKAGED, packageDir));

      if (opts.compress) {
        log.warn(format(strings.messages.cli.COMPRESSING, compressedPackagePath));

        local.compress(packageDir, compressedPackagePath, function(err){
          if(err){
            log.err(format(strings.errors.cli.PACKAGE_CREATION_FAIL, err)); 
            return callback(err); 
          }
          log.ok(format(strings.messages.cli.COMPRESSED, compressedPackagePath));
          callback(null, component);
        });
      } else {
        callback(null, component);
      }
    });
  };
};