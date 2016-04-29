'use strict';

var format = require('stringformat');
var semver = require('semver');

var packageInfo = require('../../../../package.json');

module.exports = function(userAgent) {
  var result = { isValid: false};
  var error = {
    suggestedVersion: format('{0}.{1}.X', semver.major(packageInfo.version), semver.minor(packageInfo.version)),
    registryVersion: packageInfo.version,
    cliVersion: ''
  };

  if(!userAgent) {
    result.error = error;
    result.error.code = 'empty';
    return result;
  }

  var matchVersion = /oc-cli-([\w|.]+).*/.exec(userAgent);
  if(!matchVersion) {
    result.error = error;
    result.error.code = result.error.cliVersion = 'not_valid';
    return result;
  }

  var cliVersion = matchVersion[1];
  if(semver.lt(cliVersion, packageInfo.version)) {
    result.error = error;
    result.error.code = 'old_version';
    result.error.cliVersion = cliVersion;
    return result;
  }

  result.isValid = true;
  return result;
};
