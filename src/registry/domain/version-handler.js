'use strict';

const semver = require('semver');
const semverExtra = require('semver-extra');
const _ = require('underscore');

module.exports = {
  getAvailableVersion: function(requestedVersion, availableVersions){

    if(_.isUndefined(requestedVersion)){
      requestedVersion = '';
    }

    const version = semver.maxSatisfying(availableVersions, requestedVersion) || undefined;
    const max = semverExtra.max(availableVersions);
    const isLatest = requestedVersion === '';
    return version || (isLatest && max) || undefined;
  },
  validateNewVersion: function(requestedVersion, availableVersions){
    return !_.contains(availableVersions, requestedVersion);
  }
};
