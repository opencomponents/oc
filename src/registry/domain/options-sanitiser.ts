import settings from '../../resources/settings';
import { Config } from '../../types';
import * as auth from './authentication';

const DEFAULT_NODE_KEEPALIVE_MS = 5000;

interface Input extends Partial<Omit<Config, 'beforePublish'>> {
  baseUrl: string;
}

export default function optionsSanitiser(input: Input): Config {
  const options = { ...input };

  if (!options.publishAuth) {
    (options as Config).beforePublish = (_req, _res, next) => next();
  } else {
    (options as Config).beforePublish = auth.middleware(options.publishAuth);
  }

  if (!options.publishValidation) {
    options.publishValidation = () => ({
      isValid: true
    });
  }

  if (!options.prefix) {
    options.prefix = '/';
  }

  const hasTrailingPrefix = new RegExp(options.prefix + '$');
  if (!options.baseUrl.match(hasTrailingPrefix)) {
    options.baseUrl = options.baseUrl.replace(/\/$/, '') + options.prefix;
  }

  if (!options.tempDir) {
    options.tempDir = settings.registry.defaultTempPath;
  }

  if (typeof options.hotReloading !== 'boolean') {
    options.hotReloading = !!options.local;
  }

  if (!options.verbosity) {
    options.verbosity = 0;
  }

  if (typeof options.discovery === 'undefined') {
    options.discovery = true;
  }

  if (typeof options.pollingInterval === 'undefined') {
    options.pollingInterval = 5;
  }

  if (!options.templates) {
    options.templates = [];
  }

  if (!options.dependencies) {
    options.dependencies = [];
  }

  if (
    typeof options.fallbackRegistryUrl !== 'undefined' &&
    !options.fallbackRegistryUrl.endsWith('/')
  ) {
    options.fallbackRegistryUrl += '/';
  }

  options.customHeadersToSkipOnWeakVersion = (
    options.customHeadersToSkipOnWeakVersion || []
  ).map(s => s.toLowerCase());

  options.port = options.port || process.env['PORT'] || 3000;
  options.timeout = options.timeout || 1000 * 60 * 2;
  options.keepAliveTimeout =
    options.keepAliveTimeout || DEFAULT_NODE_KEEPALIVE_MS;

  if (options.s3) {
    options.storage = {
      adapter: require('oc-s3-storage-adapter'),
      options: options.s3
    };
  }

  if (options.storage && !options.storage.adapter) {
    options.storage.adapter = require('oc-s3-storage-adapter');
  }

  if (options.refreshInterval && options.storage) {
    options.storage.options['refreshInterval'] = options.refreshInterval;
  }

  if (options.verbosity && options.storage) {
    options.storage.options['verbosity'] = options.verbosity;
  }

  if (
    options.storage &&
    options.storage.options &&
    options.storage.options['path']
  ) {
    options.storage.options['path'] =
      options.storage.options['path'].indexOf('http') === 0
        ? options.storage.options['path']
        : `https:${options.storage.options['path']}`;
  }

  if (!options.env) {
    options.env = {};
  }

  return options as Config;
}
