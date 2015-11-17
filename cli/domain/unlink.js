'use strict';

var fs = require('fs-extra');
var settings = require('../../resources/settings');

module.exports = function(){
  return function(componentName, callback){
    fs.readJson(settings.configFile.src, function(err, localConfig){

      localConfig = localConfig || {};

      if(!!localConfig.components[componentName]){
        delete localConfig.components[componentName];
      }

      fs.writeJson(settings.configFile.src, localConfig, callback);
    });
  };
};
