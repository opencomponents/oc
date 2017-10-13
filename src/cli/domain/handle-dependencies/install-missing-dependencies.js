'use strict';

const format = require('stringformat');
const path = require('path');
const _ = require('lodash');

const getMissingDependencies = require('./get-missing-dependencies');
const npm = require('../../../utils/npm-utils');
const strings = require('../../../resources/index');

module.exports = (options, cb) => {
  const { allDependencies, logger, missingDependencies } = options;

  logger.warn(
    format(
      strings.messages.cli.INSTALLING_DEPS,
      missingDependencies.join(', ')
    ),
    true
  );

  const npmOptions = {
    dependencies: missingDependencies,
    installPath: path.resolve('.'),
    save: false,
    silent: true
  };

  npm.installDependencies(npmOptions, err => {
    if (err || !_.isEmpty(getMissingDependencies(allDependencies))) {
      logger.fail('FAIL');
      return callback(strings.messages.cli.DEPENDENCIES_INSTALL_FAIL);
    }
    logger.ok('OK');
    cb();
  });
};
