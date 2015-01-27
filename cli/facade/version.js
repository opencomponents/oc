'use strict';

var packageInfo = require('../../package.json');

module.exports = function(dependencies){
  
  var logger = dependencies.logger;

  return function(){
    return logger.log(packageInfo.version);
  };
};