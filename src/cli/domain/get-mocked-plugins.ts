import path from 'node:path';

import strings from '../../resources/';
import type { Logger } from '../logger';
import { getOcConfig } from './ocConfig';

interface MockedPlugin {
  register: (options: unknown, dependencies: unknown, next: () => void) => void;
  execute: (...args: unknown[]) => unknown;
  context?: boolean;
}

interface PluginMock {
  context: boolean;
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
  _options: unknown,
  _dependencies: unknown,
  next: () => void
) => {
  next();
};

const registerStaticMocks = (
  mocks: Record<string, string>,
  logger: Logger
): PluginMock[] =>
  Object.entries(mocks).map(([pluginName, mockedValue]) => {
    logger.ok(`├── ${pluginName} () => ${mockedValue}`);

    return {
      context: false,
      name: pluginName,
      register: {
        register: defaultRegister,
        execute: () => mockedValue
      }
    };
  });

const registerDynamicMocks = (
  ocJsonLocation: string,
  mocks: Record<string, string>,
  logger: Logger
) =>
  Object.entries(mocks)
    .map(([pluginName, source]) => {
      let pluginMock: any;
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
      const context = (pluginMock as MockedPlugin).context || false;

      logger.ok(`├── ${pluginName} () => [Function]`);

      return {
        name: pluginName,
        register: { execute, register },
        context
      };
    })
    .filter((pluginMock): pluginMock is PluginMock => !!pluginMock);

export default function getMockedPlugins(
  logger: Logger,
  componentsDir?: string
): PluginMock[] {
  componentsDir = path.resolve(componentsDir || '.');

  let plugins: PluginMock[] = [];

  const content = getOcConfig(componentsDir);
  const ocJsonLocation = content.sourcePath
    ? path.dirname(content.sourcePath)
    : componentsDir;

  if (!content.development?.plugins) {
    return plugins;
  }

  logger.warn(strings.messages.cli.REGISTERING_MOCKED_PLUGINS);

  plugins = plugins.concat(
    registerStaticMocks(content.development.plugins.static ?? {}, logger)
  );
  plugins = plugins.concat(
    registerDynamicMocks(
      ocJsonLocation,
      content.development.plugins.dynamic ?? {},
      logger
    )
  );

  return plugins;
}
