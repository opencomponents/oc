'use strict';

var colors = require('colors/safe');
var format = require('stringformat');
var path = require('path');
var _ = require('underscore');

var packageInfo = require('../components/oc-client/_package/package');

module.exports = function(repository, options, callback){

  if(options.local){
    return callback(null, 'ok');
  }

  var logger = !!options.verbosity ? console : { log: _.noop };

  logger.log(format(colors.yellow('Connecting to library: {0}/{1}'), options.s3.bucket, options.s3.componentsDir));

  repository.getComponentVersions('oc-client', function(err, componentInfo){

    if(err){
      return logger.log(colors.red(err));
    }

    logger.log(format(colors.yellow('Ensuring oc-client@{0} is available on library...'), packageInfo.version));

    if(!_.contains(componentInfo, packageInfo.version)){

      logger.log(colors.yellow('Component not found. Publishing it...'));

      var pkgInfo = {
        outputFolder: path.resolve(__dirname, '../components/oc-client/_package'),
        packageJson: packageInfo
      };
      
      repository.publishComponent(pkgInfo, 'oc-client', packageInfo.version, function(err, res){
        if(!err){
          logger.log(colors.green('Component published.'));
        } else {
          logger.log(colors.red(format('Component not published: {0}', _.first(err).message)));
        }

        callback(err, res);
      });
    } else {
      logger.log(colors.green('Component is available on library.'));
      callback(null, 'ok');
    }
  });
};