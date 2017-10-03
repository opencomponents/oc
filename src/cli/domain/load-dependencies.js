'use strict';

const format = require('stringformat');
const path = require('path');
const _ = require('lodash');

const getComponentsDependencies = require('./get-components-deps');
const getMissingDeps = require('./get-missing-deps');
const npm = require('../../utils/npm-utils');
const strings = require('../../resources/index');

module.exports = function loadDependencies({ components, logger }, cb) {
  logger.warn(strings.messages.cli.CHECKING_DEPENDENCIES, true);
  let dependencies;
  try {
    dependencies = getComponentsDependencies(components);
  } catch (err) {
    return logger.err(err);
  }

  const missing = getMissingDeps(dependencies.withVersions, components);

  if (_.isEmpty(missing)) {
    logger.ok('OK');
    return cb(dependencies);
  }

  logger.err('FAIL');
  installMissingDeps({ missing, logger }, () => {
    loadDependencies({ components, logger }, cb);
  });
};

function installMissingDeps({ missing, logger }, cb) {
  if (_.isEmpty(missing)) {
    return cb();
  }

  logger.warn(format(strings.messages.cli.INSTALLING_DEPS, missing.join(', ')));

  const options = {
    dependencies: missing,
    installPath: path.resolve('.'),
    save: false
  };

  npm.installDependencies(options, err => {
    if (err) {
      logger.err(err.toString());
      throw err;
    }
    cb();
  });
}
