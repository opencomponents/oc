'use strict';

const strings = require('../../resources/index').default;

module.exports = function(dependencies) {
  const local = dependencies.local,
    logger = dependencies.logger;

  return function(opts, callback) {
    local.mock(opts, (err, res) => {
      logger.ok(
        strings.messages.cli.MOCKED_PLUGIN(opts.targetName, opts.targetValue)
      );
      callback(err, res);
    });
  };
};
