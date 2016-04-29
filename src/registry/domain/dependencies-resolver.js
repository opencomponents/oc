'use strict';

var colors = require('colors');
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

var strings = require('../../resources');

module.exports = function(options){
  var logger = !!options.verbosity ? console : { log: _.noop },
      depObj = {};

  logger.log(strings.messages.registry.RESOLVING_DEPENDENCIES.yellow);

  _.forEach(options.dependencies, function(dependency){
    var dependenciesBasePath = path.resolve('.', 'node_modules'),
        dependencyPath = path.resolve(dependenciesBasePath, dependency),
        packagePath = path.resolve(dependencyPath, 'package.json');

    if(!fs.existsSync(packagePath)){
      logger.log((dependency + ' => ').yellow + strings.errors.registry.GENERIC_NOT_FOUND.red);
      throw strings.errors.registry.CONFIGURATION_A_DEPENDENCY_NOT_FOUND;
    } else {
      try {
        depObj[dependency] = require(dependencyPath);
        logger.log('├── '.green + dependency + '@' + fs.readJsonSync(packagePath).version);
      } catch(e){
        logger.log((dependency + ' => ').yellow + strings.errors.registry.GENERIC_ERROR.red);
        throw e;
      }
    }
  });

  return depObj;
};