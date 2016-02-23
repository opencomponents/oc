'use strict';

var packageInfo = require('../../package.json');
var wrapCliCallback = require('./wrap-cli-callback');

module.exports = function(dependencies){
  return function(callback){
    callback = wrapCliCallback(callback);
    dependencies.logger.log(packageInfo.version);
    callback();
  };
};