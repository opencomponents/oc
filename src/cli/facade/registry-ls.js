'use strict';

const format = require('stringformat');
const _ = require('lodash');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies) {
  const registry = dependencies.registry,
    logger = dependencies.logger;

  return function(opts, callback) {
    callback = wrapCliCallback(callback);

    registry.get((err, registries) => {
      if (err) {
        logger.err(format(strings.errors.generic, err));
        return callback(err);
      } else {
        logger.warn(strings.messages.cli.REGISTRY_LIST);

        if (registries.length === 0) {
          err = strings.errors.cli.REGISTRY_NOT_FOUND;
          logger.err(err);
          return callback(err);
        }

        _.forEach(registries, registryLocation => logger.ok(registryLocation));

        callback(null, registries);
      }
    });
  };
};
