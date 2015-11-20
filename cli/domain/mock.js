'use strict';

var fs = require('fs-extra');
var settings = require('../../resources/settings');
var path = require('path');

module.exports = function(){
  return function(params, callback){

    fs.readJson(settings.configFile.src, function(err, localConfig){

      localConfig = localConfig || {};

      var mockType = params.targetType + 's';

      if(!localConfig.mocks){
        localConfig.mocks = {};
      }

      if(!localConfig.mocks[mockType]){
        localConfig.mocks[mockType] = {};
      }

      var pluginType = 'static';
      if(fs.existsSync(path.resolve(params.targetValue))){
        pluginType = 'dynamic';
      }

      if(!localConfig.mocks[mockType][pluginType]){
        localConfig.mocks[mockType][pluginType] = {};
      }

      localConfig.mocks[mockType][pluginType][params.targetName] = params.targetValue;

      return fs.writeJson(settings.configFile.src, localConfig, {spaces: 2}, callback);
    });
  };
};
