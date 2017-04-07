'use strict';

var fs = require('fs-extra');
var path = require('path');
var semver = require('semver');

var packageJson = require('../package');

module.exports = function(grunt){

  grunt.registerTask('version', 'Does the version upgrade', function(versionType){

    packageJson.version = semver.inc(packageJson.version, versionType);
    grunt.config.set('version', packageJson.version);

    grunt.log.ok('Package version upgrading to: ' + packageJson.version);

    fs.writeJsonSync(path.join(__dirname, '../package.json'), packageJson, {spaces: 2});

    grunt.task.run([
      'test-local-silent',
      'build',
      'git-stage'
    ]);
  });
};