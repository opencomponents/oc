'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const getMissingDependencies = require('./get-missing-dependencies');
const strings = require('../../../resources/index');
const stripVersion = require('../../../utils/strip-version');

module.exports = (options, callback) => {
  const { componentPath, dependencies, logger } = options;

  const missingDependencies = getMissingDependencies(dependencies);

  if (_.isEmpty(missingDependencies)) {
    return callback(null);
  }

  logger.warn(
    strings.messages.cli.LINKING_DEPENDENCIES(missingDependencies.join(', ')),
    true
  );

  const symLinkType = 'dir';
  let symLinkError = false;
  _.each(missingDependencies, dependency => {
    const moduleName = stripVersion(dependency);
    const pathToComponentModule = path.resolve(
      componentPath,
      'node_modules',
      moduleName
    );
    const pathToModule = path.resolve('.', 'node_modules', moduleName);
    try {
      fs.ensureSymlinkSync(pathToComponentModule, pathToModule, symLinkType);
    } catch (err) {
      symLinkError = true;
      logger.err(strings.errors.cli.DEPENDENCY_LINK_FAIL(moduleName, err));
    }
  });
  return !symLinkError
    ? callback(null)
    : callback(strings.errors.cli.DEPENDENCIES_LINK_FAIL);
};
