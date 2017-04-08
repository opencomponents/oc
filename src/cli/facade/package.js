'use strict';

var strings = require('../../resources/index');
var wrapCliCallback = require('../wrap-cli-callback');
var format = require('stringformat');
var path = require('path');

module.exports = function(dependencies) {
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts, callback) {
    var componentPath = opts.componentPath,
        packageDir = path.resolve(componentPath, '_package'),
        compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    callback = wrapCliCallback(callback);

    logger.warn(format(strings.messages.cli.PACKAGING, packageDir));
    var packageOptions = {
      componentPath: path.resolve(componentPath)
    };
    local.package(packageOptions, function(err, component){
      if(err){
        logger.err(format(strings.errors.cli.PACKAGE_CREATION_FAIL, err)); 
        return callback(err); 
      }

      logger.ok(format(strings.messages.cli.PACKAGED, packageDir));

      if (opts.compress) {
        logger.warn(format(strings.messages.cli.COMPRESSING, compressedPackagePath));

        local.compress(packageDir, compressedPackagePath, function(err){
          if(err){
            logger.err(format(strings.errors.cli.PACKAGE_CREATION_FAIL, err)); 
            return callback(err); 
          }
          logger.ok(format(strings.messages.cli.COMPRESSED, compressedPackagePath));
          callback(null, component);
        });
      } else {
        callback(null, component);
      }
    });
  };
};