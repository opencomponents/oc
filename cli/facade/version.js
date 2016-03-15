'use strict';

var packageInfo = require('../../package.json');

module.exports = function(dependencies){
  return function(){
    dependencies.logger.log(packageInfo.version);
  };
};