'use strict';

const path = require('path');
const _ = require('lodash');

const cleanRequire = require('../../../utils/clean-require');

module.exports = dependencies => {
  const missing = [];
  _.each(dependencies, (version, dependency) => {
    const pathToModule = path.resolve('node_modules/', dependency);
    if (!cleanRequire(pathToModule, { justTry: true, resolve: true })) {
      missing.push(`${dependency}@${version || 'latest'}`);
    }
  });
  return missing;
};
