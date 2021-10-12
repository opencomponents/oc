import fs from 'fs-extra';
import path from 'path';
import _ from 'lodash';

import settings from '../../resources/settings';
import strings from '../../resources/';
import { Logger } from '../logger';

interface MockedPlugin {
  register: (options: unknown, dependencies: unknown, next: () => void) => void;
  execute: (...args: unknown[]) => unknown;
}

interface PluginMock {
  name: string;
  register: {
    register: (
      options: unknown,
      dependencies: unknown,
      next: () => void
    ) => void;
    execute: (...args: unknown[]) => unknown;
  };
}

const isMockValid = (
  plugin: unknown
): plugin is MockedPlugin | ((...args: unknown[]) => unknown) => {
  const isFunction = typeof plugin === 'function';
  const isValidObject =
    !!plugin &&
    typeof plugin === 'object' &&
    typeof (plugin as MockedPlugin).register === 'function' &&
    typeof (plugin as MockedPlugin).execute === 'function';

  return isFunction || isValidObject;
};

const defaultRegister = (
  options: unknown,
  dependencies: unknown,
  next: () => void
) => {
  next();
};

const registerStaticMocks = (
  mocks: Dictionary<string>,
  logger: Logger
): PluginMock[] =>
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

const registerDynamicMocks = (
  ocJsonLocation: string,
  mocks: Dictionary<string>,
  logger: Logger
) =>
  _.map(mocks, (source, pluginName) => {
    let pluginMock;
    try {
      pluginMock = require(path.resolve(ocJsonLocation, source));
    } catch (er) {
      logger.err(String(er));
      return;
    }

    if (!isMockValid(pluginMock)) {
      logger.err(`├── ${pluginName} () => Error (skipping)`);
      logger.err(strings.errors.cli.MOCK_PLUGIN_IS_NOT_VALID);
      return;
    }

    const register = (pluginMock as MockedPlugin).register || defaultRegister;
    const execute = (pluginMock as MockedPlugin).execute || pluginMock;

    logger.ok(`├── ${pluginName} () => [Function]`);

    return {
      name: pluginName,
      register: { execute, register }
    };
  }).filter((pluginMock): pluginMock is PluginMock => !!pluginMock);

const findPath = (
  pathToResolve: string,
  fileName: string
): string | undefined => {
  const rootDir = fs.realpathSync('.');
  const fileToResolve = path.join(pathToResolve, fileName);

  if (!fs.existsSync(fileToResolve)) {
    if (pathToResolve === rootDir) {
      return undefined;
    } else {
      const getParent = (pathToResolve: string) =>
        pathToResolve.split('/').slice(0, -1).join('/');

      const parentDir = pathToResolve ? getParent(pathToResolve) : rootDir;

      return findPath(parentDir, fileName);
    }
  }

  return fileToResolve;
};

export default function getMockedPlugins(
  logger: Logger,
  componentsDir: string
): PluginMock[] {
  componentsDir = path.resolve(componentsDir || '.');

  let plugins: PluginMock[] = [];
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
}
