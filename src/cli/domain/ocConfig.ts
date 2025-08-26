import fs from 'node:fs';
import settings from '../../resources/settings';

export interface OpenComponentsConfig {
  /** JSON schema specification reference */
  $schema?: string | null;
  /** List of registry URLs where components will be published */
  registries?: string[];
  /** Development-specific configuration settings */
  development?: {
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
  registries: string[];
  development: {
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

function parseConfig(config: OpenComponentsConfig): ParsedConfig {
  const plugins = {
    ...(config.mocks?.plugins || {}),
    ...(config.development?.plugins || {})
  };

  const parsedConfig: ParsedConfig = {
    ...config,
    registries: config.registries || [],
    development: {
      plugins
    }
  };

  return parsedConfig;
}

export function getOcConfig(path?: string): ParsedConfig {
  try {
    const config = JSON.parse(
      fs.readFileSync(path || settings.configFile.src, 'utf8')
    );
    return parseConfig(config);
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
  fs.writeFileSync(
    path || settings.configFile.src,
    JSON.stringify(parseConfig(config), null, 2)
  );
}
