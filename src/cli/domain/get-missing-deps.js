'use strict';

var path = require('path');
var _ = require('underscore');

module.exports = function(dependencies){

  var missing = [];

  _.forEach(dependencies, function(npmModule){
 
    var index = npmModule.indexOf('@'),
        moduleName = npmModule;
    
    if (index > 0) {
      moduleName = npmModule.substr(0, index);
    }
    var pathToModule = path.resolve('node_modules/', moduleName);
    
    try {
      if(!!require.cache[pathToModule]){
        delete require.cache[pathToModule];
      }

      require(pathToModule);
    } catch (exception) {
      missing.push(npmModule);
    }
  });

  return missing;
};
