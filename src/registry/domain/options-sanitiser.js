'use strict';

const _ = require('lodash');

const settings = require('../../resources/settings');
const auth = require('./authentication');

module.exports = function(input) {
  const options = _.clone(input);

  if (!options.publishAuth) {
    options.beforePublish = (req, res, next) => next();
  } else {
    options.beforePublish = auth.middleware(options.publishAuth);
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

  if (!_.isBoolean(options.hotReloading)) {
    options.hotReloading = !!options.local;
  }

  if (_.isUndefined(options.verbosity)) {
    options.verbosity = 0;
  }

  if (_.isUndefined(options.discovery)) {
    options.discovery = true;
  }

  if (
    !_.isUndefined(options.fallbackRegistryUrl) &&
    _.last(options.fallbackRegistryUrl) !== '/'
  ) {
    options.fallbackRegistryUrl += '/';
  }

  options.customHeadersToSkipOnWeakVersion = (options.customHeadersToSkipOnWeakVersion ||
    []
  ).map(s => s.toLowerCase());

  options.port = process.env.PORT || options.port;
  options.timeout = options.timeout || 1000 * 60 * 2;

  if (options.s3) {
    options.storage = {};
    options.storage.adapter = require('./s3');
    options.storage.options = options.s3;
  }

  if (options.storage && !options.storage.adapter) {
    options.storage.adapter = require('./s3');
  }

  if (options.refreshInterval && options.storage) {
    options.storage.options.refreshInterval = options.refreshInterval;
  }

  if (options.verbosity && options.storage) {
    options.storage.options.verbosity = options.verbosity;
  }

  return options;
};
