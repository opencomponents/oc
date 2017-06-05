'use strict';

const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');

const packageJson = require('../package');

module.exports = function(grunt){

  grunt.registerTask('version', 'Does the version upgrade', (versionType) => {

    packageJson.version = semver.inc(packageJson.version, versionType);
    grunt.config.set('version', packageJson.version);

    grunt.log.ok('Package version upgrading to: ' + packageJson.version);

    fs.writeJsonSync(path.join(__dirname, '../package.json'), packageJson, {spaces: 2});

    grunt.task.run([
      'build',
      'test-local-silent',
      'git-stage'
    ]);
  });
};
