'use strict';

const semver = require('semver');

const packageInfo = require('../../../../package.json');

module.exports = function(userAgent, nodeVersion) {
  const result = { isValid: false };
  const error = {
    suggestedVersion: packageInfo.engines.node || '*',
    registryNodeVersion: nodeVersion,
    cliNodeVersion: ''
  };

  if (!userAgent) {
    result.error = error;
    result.error.code = 'empty';
    return result;
  }

  const matchVersion = /.*\/v([\w|.]+)-.*/.exec(userAgent);
  if (!matchVersion) {
    result.error = error;
    result.error.code = result.error.nodeVersion = 'not_valid';
    return result;
  }

  const cliNodeVersion = matchVersion[1];
  if (!semver.satisfies(cliNodeVersion, packageInfo.engines.node)) {
    result.error = error;
    result.error.code = 'not_matching';
    result.error.cliNodeVersion = cliNodeVersion;
    return result;
  }

  result.isValid = true;
  return result;
};
