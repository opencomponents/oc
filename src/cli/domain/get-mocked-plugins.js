'use strict';

var colors = require('colors/safe');
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

var settings = require('../../resources/settings');
var strings = require('../../resources/');

var registerStaticMocks = function(mocks, logger){
  return _.map(mocks, function(mockedValue, pluginName){
    logger.log(colors.green('├── ' + pluginName + ' () => ' + mockedValue));
    return {
      name: pluginName,
      register: {
        register: function(options, dependencies, next){
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
      logger.log(colors.red(er.toString()));
      return;
    }

    if(!_.isFunction(p)){
      logger.log(colors.red(strings.errors.cli.MOCK_PLUGIN_IS_NOT_A_FUNCTION));
      return;
    }

    logger.log(colors.green('├── ' + pluginName + ' () => [Function]'));
    return {
      name: pluginName,
      register: {
        register: function(options, dependencies, next){
          return next();
        },
        execute: p
      }
    };
  }).filter(function(p){ return p; });
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

  logger.log(colors.yellow(strings.messages.cli.REGISTERING_MOCKED_PLUGINS));

  plugins = plugins.concat(registerStaticMocks(content.mocks.plugins.static, logger));
  plugins = plugins.concat(registerDynamicMocks(content.mocks.plugins.dynamic, logger));

  return plugins;
};
