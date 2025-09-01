import fs from 'node:fs';
import path from 'node:path';
import settings from '../../resources/settings';

export interface OpenComponentsConfig {
  /** JSON schema specification reference */
  $schema?: string | null;
  /** List of registry URLs where components will be published */
  registries?: string[];
  /** Development-specific configuration settings */
  development?: {
    /** JavaScript code to be included in the preview HTML's <head> section.
     * Can be either a filepath to a JS script or inline JavaScript code.
     */
    preload?: string;
    /** Fallback configuration for when components cannot be found locally */
    fallback?: {
      /** URL of the fallback registry to use when components cannot be found locally */
      url: string;
      /** Whether to use the fallback registry's oc-client-browser.js for previewing components */
      client?: boolean;
    };

    /** Plugin mocking configuration for development */
    plugins?: {
      /** Dynamic plugin mocks - file paths to JavaScript modules */
      dynamic?: Record<string, string>;
      /** Static plugin mocks - static values that will always be returned */
      static?: Record<string, string>;
    };
  };
  /** @deprecated Use development.plugins instead */
  mocks?: {
    /** @deprecated Use development.plugins instead */
    plugins?: {
      /** @deprecated Use development.plugins.dynamic instead */
      dynamic?: Record<string, string>;
      /** @deprecated Use development.plugins.static instead */
      static?: Record<string, string>;
    };
  };
}

type ParsedConfig = {
  sourcePath?: string;
  registries: string[];
  development: {
    preload?: string;
    plugins: {
      dynamic?: Record<string, string>;
      static?: Record<string, string>;
    };
    fallback?: {
      url: string;
      client?: boolean;
    };
  };
};

const findPath = (
  pathToResolve: string,
  fileName: string
): string | undefined => {
  const rootDir = fs.realpathSync('.');
  const fileToResolve = path.join(pathToResolve, fileName);

  if (!fs.existsSync(fileToResolve)) {
    if (pathToResolve === rootDir) {
      return undefined;
    }
    const getParent = (pathToResolve: string) =>
      pathToResolve.split('/').slice(0, -1).join('/');

    const parentDir = pathToResolve ? getParent(pathToResolve) : rootDir;

    return findPath(parentDir, fileName);
  }

  return fileToResolve;
};

function parseConfig(config: OpenComponentsConfig): ParsedConfig {
  const plugins = {
    ...(config.mocks?.plugins || {}),
    ...(config.development?.plugins || {})
  };

  const parsedConfig: ParsedConfig = {
    ...config,
    registries: config.registries || [],
    development: {
      preload: config.development?.preload,
      plugins,
      fallback: config.development?.fallback
    }
  };

  return parsedConfig;
}

export function getOcConfig(folder?: string): ParsedConfig {
  const configPath = folder
    ? findPath(folder, settings.configFile.src.replace('./', '')) ||
      settings.configFile.src
    : settings.configFile.src;

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...parseConfig(config), sourcePath: configPath };
  } catch {
    return {
      registries: [],
      development: {
        plugins: {}
      }
    };
  }
}

export function setOcConfig(config: ParsedConfig, path?: string) {
  const { sourcePath, ...rest } = config;
  fs.writeFileSync(
    path || sourcePath || settings.configFile.src,
    JSON.stringify(rest, null, 2)
  );
}
