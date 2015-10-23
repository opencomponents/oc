'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');
var strings = require('../../resources/');
var settings = require('../../resources/settings');

var registerStaticMocks = function(mocks, logger){
  return _.map(mocks, function(mockedValue, pluginName){
    logger.log('├── '.green + pluginName + ' () => ' + mockedValue);
    return {
      name: pluginName,
      register: {
        register: function(options, next){
          return next();
        },
        execute: function(){
          return mockedValue;
        }
      }
    };
  });
};

var registerDynamicMocks = function(mocks, logger){
  return _.map(mocks, function(source, pluginName){
    var p;
    try {
      p = require(path.resolve(source));
    } catch(er) {
      logger.log(er.toString().red);
      return;
    }

    logger.log('├── '.green + pluginName + ' () => [Function]');
    return {
      name: pluginName,
      register: {
        register: function(options, next){
          return next();
        },
        execute: p
      }
    };
  });
};

module.exports = function(logger){
  var plugins = [],
      ocJsonPath = path.resolve(settings.configFile.src);

  if(!fs.existsSync(ocJsonPath)){
    return plugins;
  }

  var content = fs.readJsonSync(ocJsonPath);
  if(!content.mocks || !content.mocks.plugins){
    return plugins;
  }

  logger.log(strings.messages.cli.REGISTERING_MOCKED_PLUGINS.yellow);

  plugins = plugins.concat(registerStaticMocks(content.mocks.plugins.static, logger));
  plugins = plugins.concat(registerDynamicMocks(content.mocks.plugins.dynamic, logger));

  return plugins;
};
