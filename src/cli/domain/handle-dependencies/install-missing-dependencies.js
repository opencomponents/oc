'use strict';

const format = require('stringformat');
const path = require('path');
const _ = require('lodash');

const getMissingDependencies = require('./get-missing-dependencies');
const npm = require('../../../utils/npm-utils');
const strings = require('../../../resources/index');

module.exports = (options, callback) => {
  const { dependencies, logger } = options;

  const missing = getMissingDependencies(dependencies);

  if (_.isEmpty(missing)) {
    return callback(null);
  }

  logger.warn(
    format(strings.messages.cli.INSTALLING_DEPS, missing.join(', ')),
    true
  );

  const npmOptions = {
    dependencies: missing,
    installPath: path.resolve('.'),
    save: false,
    silent: true
  };

  npm.installDependencies(npmOptions, err => {
    if (err || !_.isEmpty(getMissingDependencies(dependencies))) {
      logger.err('FAIL');
      return callback(strings.errors.cli.DEPENDENCIES_INSTALL_FAIL);
    }
    logger.ok('OK');
    callback(null);
  });
};
