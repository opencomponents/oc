'use strict';

var format = require('stringformat');
var semver = require('semver');

var packageInfo = require('../../../package.json');

module.exports = function(userAgent, nodeVersion) {
  var result = { isValid: false};
  var error = {
    suggestedVersion: packageInfo.engines.node || '*',
    registryNodeVersion: nodeVersion,
    cliNodeVersion: ''
  };

  if(!userAgent) {
    result.error = error;
    result.error.code = 'empty';
    return result;
  }

  var matchVersion = /.*\/v([\w|.]+)-.*/.exec(userAgent);
  if(!matchVersion) {
    result.error = error;
    result.error.code = result.error.nodeVersion = 'not_valid';
    return result;
  }

  var cliNodeVersion = matchVersion[1];
  if(!semver.satisfies(cliNodeVersion, packageInfo.engines.node)) {
    result.error = error;
    result.error.code = 'not_matching';
    result.error.cliNodeVersion = cliNodeVersion;
    return result;
  }

  result.isValid = true;
  return result;
};
