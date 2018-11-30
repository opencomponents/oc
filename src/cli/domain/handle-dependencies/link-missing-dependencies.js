'use strict';

const format = require('stringformat');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const getMissingDependencies = require('./get-missing-dependencies');
const strings = require('../../../resources/index');

const getModuleName = dependency => dependency.split('@')[0];

module.exports = (options, callback) => {
  const { componentPath, dependencies, logger } = options;

  const missingDependencies = getMissingDependencies(dependencies);

  if (_.isEmpty(missingDependencies)) {
    return callback(null);
  }

  logger.warn(
    format(
      strings.messages.cli.LINKING_DEPENDENCIES,
      missingDependencies.join(', ')
    ),
    true
  );

  const symLinkType = 'dir';
  let symLinkError = false;
  _.each(missingDependencies, dependency => {
    const moduleName = getModuleName(dependency);
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
      logger.err(
        format(strings.errors.cli.DEPENDENCY_LINK_FAIL, moduleName, err)
      );
    }
  });
  return !symLinkError
    ? callback(null)
    : callback(strings.errors.cli.DEPENDENCIES_LINK_FAIL);
};
