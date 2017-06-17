'use strict';

const coreModules = require('builtin-modules');
const _ = require('lodash');

const RequireWrapper = require('../../domain/require-wrapper');

module.exports = dependencies =>
  _.map(dependencies, dependency => {
    const requirer = RequireWrapper(dependencies);
    const core = _.includes(coreModules, dependency);
    const packageJson = !core && requirer(`${dependency}/package.json`);
    const version = packageJson && packageJson.version;
    const link = core
      ? `https://nodejs.org/api/${dependency}.html`
      : packageJson.homepage;

    return { core, name: dependency, version, link };
  });
