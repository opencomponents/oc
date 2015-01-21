'use strict';

var semver = require('semver');
var _ = require('underscore');

module.exports = {
  getAvailableVersion: function(requestedVersion, availableVersions){

    if(_.isUndefined(requestedVersion)){
      requestedVersion = '';
    }

    return semver.maxSatisfying(availableVersions, requestedVersion) || undefined;
  },
  validateNewVersion: function(requestedVersion, availableVersions){
    return !_.contains(availableVersions, requestedVersion);
  }
};