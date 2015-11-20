'use strict';

var fs = require('fs-extra');
var format = require('stringformat');
var request = require('../../utils/request');
var settings = require('../../resources/settings');

module.exports = function(){
  return function(componentName, componentVersion, callback){

    fs.readJson(settings.configFile.src, function(err, localConfig){
      if(err){
        return callback(err);
      }

      if(!localConfig || !localConfig.registries || localConfig.registries.length === 0){
        return callback(new Error('Registry configuration not found. Add a registry reference to the project first'));
      }

      localConfig.components = localConfig.components || {};

      if(!!localConfig.components[componentName]){
        return callback(new Error('Component already linked in the project'));
      }

      var componentHref = format('{0}/{1}/{2}', localConfig.registries[0], componentName, componentVersion);

      request(componentHref, function(err, res){
        if(err || !res){
          return callback(new Error('Component not available'));
        }

        try {
          var apiResponse = JSON.parse(res);

          if(apiResponse.type !== 'oc-component'){
            return callback(new Error('not a valid oc Component'));
          }
        } catch(e){
          return callback(new Error('not a valid oc Component'));
        }

        localConfig.components[componentName] = componentVersion;
        fs.writeJson(settings.configFile.src, localConfig, callback);
      });
    });
  };
};
