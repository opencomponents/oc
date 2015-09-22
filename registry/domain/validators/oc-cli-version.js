'use strict';

var semver = require('semver');

var packageInfo = require('../../../package.json');

module.exports = function(headers) {
  var userAgent = headers['user-agent'];

  if(!userAgent) {
    return false;
  }

  var matchVersion = /oc-cli-([\w|.]+).*/.exec(userAgent);
  if(!matchVersion) {
    return false;
  }

  var cliVersion = matchVersion[1];
  if(semver.lt(cliVersion, packageInfo.version)) {
    return false;
  }

  return true;
};
