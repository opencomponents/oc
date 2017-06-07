'use strict';

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies) {
  const registry = dependencies.registry,
    logger = dependencies.logger;

  return function(opts, callback) {
    callback = wrapCliCallback(callback);

    registry.add(opts.registryUrl, err => {
      if (err) {
        logger.err(err);
        return callback(err);
      }

      logger.ok(strings.messages.cli.REGISTRY_ADDED);
      callback(null, 'ok');
    });
  };
};
