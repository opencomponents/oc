'use strict';

var fs = require('fs-extra');
var path = require('path');
var semver = require('semver');

module.exports = function(grunt, pkg){
  return function(versionType){

    pkg.version = semver.inc(pkg.version, versionType);
    grunt.config.set('version', pkg.version);

    grunt.log.ok('Client package version upgrading to: ' + pkg.version);

    fs.writeJsonSync(path.join(__dirname, '../../client/package.json'), pkg, {spaces: 2});

    grunt.task.run([
      'test-local-silent',
      'build',
      'git-stage-client'
    ]);
  };
};