'use strict';

const colors = require('colors/safe');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const settings = require('../../resources/settings');
const strings = require('../../resources/');

const registerStaticMocks = function(mocks, logger){
  return _.map(mocks, (mockedValue, pluginName) => {
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

const registerDynamicMocks = function(ocJsonLocation, mocks, logger){
  return _.map(mocks, (source, pluginName) => {

    let p;
    try {
      p = require(path.resolve(ocJsonLocation, source));
    } catch(er) {
      logger.err(er.toString());
      return;
    }

    if(!_.isFunction(p)){
      logger.err(strings.errors.cli.MOCK_PLUGIN_IS_NOT_A_FUNCTION);
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
  }).filter((p) => p);
};

const findPath = function(pathToResolve, fileName) {

  const rootDir = fs.realpathSync('.'),
    fileToResolve = path.join(pathToResolve, fileName);

  if (!fs.existsSync(fileToResolve)) {
    if (pathToResolve === rootDir) {
      return undefined;
    } else {
      const getParent = function(x){ return x.split('/').slice(0, -1).join('/'); },
        parentDir = pathToResolve ? getParent(pathToResolve) : rootDir;

      return findPath(parentDir, fileName);
    }
  }

  return fileToResolve;
};

module.exports = function(logger, componentsDir){
  componentsDir = path.resolve(componentsDir || '.');

  let plugins = [];
  const ocJsonFileName = settings.configFile.src.replace('./', ''),
    ocJsonPath = findPath(componentsDir, ocJsonFileName);

  if(!ocJsonPath){
    return plugins;
  }

  const content = fs.readJsonSync(ocJsonPath),
    ocJsonLocation = ocJsonPath.slice(0, -ocJsonFileName.length);

  if(!content.mocks || !content.mocks.plugins){
    return plugins;
  }

  logger.warn(strings.messages.cli.REGISTERING_MOCKED_PLUGINS);

  plugins = plugins.concat(registerStaticMocks(content.mocks.plugins.static, logger));
  plugins = plugins.concat(registerDynamicMocks(ocJsonLocation, content.mocks.plugins.dynamic, logger));

  return plugins;
};
