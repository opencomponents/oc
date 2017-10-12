'use strict';

const path = require('path');
const _ = require('lodash');

const getMissingDependencies = require('./get-missing-dependencies');
const npm = require('../../../utils/npm-utils');

module.exports = (options, cb) => {
  const { allDependencies, logger, missingDependencies } = options;

  logger.warn(
    `Installing missing dependencies: ${missingDependencies.join(', ')}...`,
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
      return callback('There was a problem installing the dependencies');
    }
    logger.ok('OK');
    cb();
  });
};
