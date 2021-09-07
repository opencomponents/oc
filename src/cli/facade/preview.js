'use strict';

const open = require('open');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies) {
  const logger = dependencies.logger,
    registry = dependencies.registry;

  return function(opts, callback) {
    callback = wrapCliCallback(callback);

    registry.getComponentPreviewUrlByUrl(opts.componentHref, (err, href) => {
      if (err) {
        logger.err(strings.errors.cli.COMPONENT_HREF_NOT_FOUND);
        return callback(strings.errors.cli.COMPONENT_HREF_NOT_FOUND);
      }
      open(href);
      callback(null, href);
    });
  };
};
