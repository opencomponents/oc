'use strict';

var fs = require('fs-extra');
var path = require('path');
var semver = require('semver');

module.exports = function(grunt, taskObject){
  return function(versionType){

    taskObject.pkg.version = semver.inc(taskObject.pkg.version, versionType);
    grunt.config.set('version', taskObject.pkg.version);

    grunt.log.ok('Package version upgrading to: ' + taskObject.pkg.version);

    fs.writeJsonSync(path.join(__dirname, '../../package.json'), taskObject.pkg, {spaces: 2});

    grunt.task.run([
      'test-local-silent',
      'generate-cli-doc',
      'build',
      'git-stage'
    ]);
  };
};