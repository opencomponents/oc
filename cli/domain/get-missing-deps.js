'use strict';

var path = require('path');
var _ = require('underscore');

module.exports = function(dependencies, components){

  var missing = [];

  _.forEach(dependencies, function(npmModule){
    var pathToModule = path.resolve('node_modules/', npmModule);

    try {
      if(!!require.cache[pathToModule]){
        delete require.cache[pathToModule];
      }

      var required = require(pathToModule);
    } catch (exception) {
      missing.push(npmModule);
    }
  });

  return missing;
};