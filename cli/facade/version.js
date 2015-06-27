'use strict';

var packageInfo = require(__BASE + '/package.json');

module.exports = function(dependencies){

  var logger = dependencies.logger;

  return function(){
    return logger.log(packageInfo.version);
  };
};