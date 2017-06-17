'use strict';

const format = require('stringformat');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies) {
  const local = dependencies.local,
    logger = dependencies.logger;

  return function(opts, callback) {
    callback = wrapCliCallback(callback);

    local.mock(opts, (err, res) => {
      logger.ok(
        format(
          strings.messages.cli.MOCKED_PLUGIN,
          opts.targetName,
          opts.targetValue
        )
      );
      callback(err, res);
    });
  };
};
