'use strict';

const path = require('path');
const _ = require('lodash');

const moduleExists = require('../../../utils/module-exists');

module.exports = (dependencies) => {
  const missing = [];
  _.each(dependencies, (version, dependency) => {
    const pathToModule = path.resolve('node_modules/', dependency);
    if (!moduleExists(pathToModule)) {
      missing.push(`${dependency}@${version || 'latest'}`);
    }
  });
  return missing;
};
