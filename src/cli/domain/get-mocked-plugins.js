'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const settings = require('../../resources/settings');
const strings = require('../../resources/');

const isMockValid = plugin => {
  const isFunction = _.isFunction(plugin);
  const isValidObject =
    _.isObject(plugin) &&
    _.isFunction(plugin.register) &&
    _.isFunction(plugin.execute);
  return isFunction || isValidObject;
};

const defaultRegister = (options, dependencies, next) => next();

const registerStaticMocks = (mocks, logger) =>
  _.map(mocks, (mockedValue, pluginName) => {
    logger.ok(`├── ${pluginName} () => ${mockedValue}`);
    return {
      name: pluginName,
      register: {
        register: defaultRegister,
        execute: () => mockedValue
      }
    };
  });

const registerDynamicMocks = (ocJsonLocation, mocks, logger) =>
  _.map(mocks, (source, pluginName) => {
    let pluginMock;
    try {
      pluginMock = require(path.resolve(ocJsonLocation, source));
    } catch (er) {
      logger.err(er.toString());
      return;
    }

    if (!isMockValid(pluginMock)) {
      logger.err(`├── ${pluginName} () => Error (skipping)`);
      logger.err(strings.errors.cli.MOCK_PLUGIN_IS_NOT_VALID);
      return;
    }

    const register = pluginMock.register || defaultRegister;
    const execute = pluginMock.execute || pluginMock;

    logger.ok(`├── ${pluginName} () => [Function]`);

    return {
      name: pluginName,
      register: { execute, register }
    };
  }).filter(pluginMock => pluginMock);

const findPath = function(pathToResolve, fileName) {
  const rootDir = fs.realpathSync('.');
  const fileToResolve = path.join(pathToResolve, fileName);

  if (!fs.existsSync(fileToResolve)) {
    if (pathToResolve === rootDir) {
      return undefined;
    } else {
      const getParent = pathToResolve =>
        pathToResolve
          .split('/')
          .slice(0, -1)
          .join('/');

      const parentDir = pathToResolve ? getParent(pathToResolve) : rootDir;

      return findPath(parentDir, fileName);
    }
  }

  return fileToResolve;
};

module.exports = function(logger, componentsDir) {
  componentsDir = path.resolve(componentsDir || '.');

  let plugins = [];
  const ocJsonFileName = settings.configFile.src.replace('./', '');
  const ocJsonPath = findPath(componentsDir, ocJsonFileName);

  if (!ocJsonPath) {
    return plugins;
  }

  const content = fs.readJsonSync(ocJsonPath);
  const ocJsonLocation = ocJsonPath.slice(0, -ocJsonFileName.length);

  if (!content.mocks || !content.mocks.plugins) {
    return plugins;
  }

  logger.warn(strings.messages.cli.REGISTERING_MOCKED_PLUGINS);

  plugins = plugins.concat(
    registerStaticMocks(content.mocks.plugins.static, logger)
  );
  plugins = plugins.concat(
    registerDynamicMocks(ocJsonLocation, content.mocks.plugins.dynamic, logger)
  );

  return plugins;
};
