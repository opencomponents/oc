'use strict';

var colors = require('colors');
var express = require('express');
var fs = require('fs-extra');
var path = require('path');
var settings = require('../../resources/settings');
var _ = require('underscore');

module.exports = function(input){
  var options = _.clone(input),
      logger = !!input.verbosity ? console : { log: _.noop };

  if(!options.publishAuth){
    options.beforePublish = function(req, res, next){ next(); };
  } else {
    options.beforePublish = express.basicAuth(options.publishAuth.username, options.publishAuth.password);
  }

  if(!options.prefix){
    options.prefix = '/';
  }

  if(!options.tempDir){
    options.tempDir = settings.registry.defaultTempPath;
  }

  if(!!options.dependencies){

    var depObj = {};

    logger.log('Resolving dependencies...'.yellow);
    
    _.forEach(options.dependencies, function(dependency){
      var dependenciesBasePath = !!options.local ? path.resolve('node_modules') : process.mainModule.paths[0],
          dependencyPath = path.resolve(dependenciesBasePath, dependency),
          packagePath = path.resolve(dependencyPath, 'package.json');

      if(!fs.existsSync(packagePath)){
        logger.log((dependency + ' => ').yellow + ('Not found!').red);
        throw 'Dependency not found';
      } else {
        try {
          depObj[dependency] = require(dependencyPath);
          logger.log((dependency + ' => ').yellow + fs.readJsonSync(packagePath).version.green);
        } catch(e){
          logger.log((dependency + ' => ').yellow + ('Error!').red);
          throw e;
        }
      }
    });

    options.dependencies = depObj;
  }

  return options;
};