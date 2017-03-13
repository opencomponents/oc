'use strict';

var semver = require('semver');
var semverExtra = require('semver-extra');
var _ = require('underscore');

module.exports = {
  getAvailableVersion: function(requestedVersion, availableVersions){

    if(_.isUndefined(requestedVersion)){
      requestedVersion = '';
    }

    var version = semver.maxSatisfying(availableVersions, requestedVersion) || undefined;
    var max = semverExtra.max(availableVersions);
    var isLatest = requestedVersion === '';
    return version || (isLatest && max) || undefined;
  },
  validateNewVersion: function(requestedVersion, availableVersions){
    return !_.contains(availableVersions, requestedVersion);
  }
};
