'use strict';

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');
const colors = require('colors/safe');
const format = require('stringformat');
const path = require('path');

module.exports = function(dependencies) {
  const local = dependencies.local,
    logger = dependencies.logger;

  const log = {
    err: function(msg){ return logger.log(colors.red(msg)); },
    ok: function(msg){ return logger.log(colors.green(msg)); },
    warn: function(msg){ return logger.log(colors.yellow(msg)); }
  };

  return function(opts, callback) {
    const componentPath = opts.componentPath,
      packageDir = path.resolve(componentPath, '_package'),
      compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    callback = wrapCliCallback(callback);

    log.warn(format(strings.messages.cli.PACKAGING, packageDir));
    const packageOptions = {
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