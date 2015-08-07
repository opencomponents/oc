'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

var settings = require('../../resources/settings');

module.exports = function(){
  var mockedPlugins = [],
      ocJsonPath = path.resolve(settings.configFile.src);

  if(fs.existsSync(ocJsonPath)){
    var content = fs.readJsonSync(ocJsonPath);

    if(!!content.mocks && !!content.mocks.plugins && !!content.mocks.plugins.static){
      _.forEach(content.mocks.plugins.static, function(mockedValue, pluginName){
        mockedPlugins.push({
          name: pluginName,
          register: {
            register: function(options, next){
              return next();
            },
            execute: function(){
              return mockedValue;
            }
          }
        });
      });
    }
  }

  return mockedPlugins;
};