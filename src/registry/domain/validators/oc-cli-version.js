'use strict';

const semver = require('semver');

const packageInfo = require('../../../../package.json');

module.exports = function(userAgent) {
  const result = { isValid: false };
  const error = {
    suggestedVersion: `${semver.major(packageInfo.version)}.${semver.minor(
      packageInfo.version
    )}.X`,
    registryVersion: packageInfo.version,
    cliVersion: ''
  };

  if (!userAgent) {
    result.error = error;
    result.error.code = 'empty';
    return result;
  }

  const matchVersion = /oc-cli-([\w|.]+).*/.exec(userAgent);
  if (!matchVersion) {
    result.error = error;
    result.error.code = result.error.cliVersion = 'not_valid';
    return result;
  }

  const cliVersion = matchVersion[1];
  if (semver.lt(cliVersion, packageInfo.version)) {
    result.error = error;
    result.error.code = 'old_version';
    result.error.cliVersion = cliVersion;
    return result;
  }

  result.isValid = true;
  return result;
};
