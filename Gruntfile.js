'use strict';

const _ = require('lodash');

module.exports = function(grunt) {
  const taskObject = { pkg: grunt.file.readJSON('package.json') };

  grunt.file.expand('tasks/*.js', '!tasks/_*.js').forEach(file => {
    let name = file.split('/');
    name = name[name.length - 1].replace('.js', '');
    const task = require('./' + file);

    if (_.isFunction(task)) {
      task(grunt);
    } else {
      taskObject[name] = task;
    }
  });

  grunt.initConfig(taskObject);
  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', ['test-local', 'build']);
  grunt.registerTask('sauce', [
    'karma:sauce-linux',
    'karma:sauce-osx',
    'karma:sauce-windows'
  ]);
  grunt.registerTask('test-local', ['mochaTest:all', 'karma:local']);
  grunt.registerTask('test-local-silent', ['mochaTest:silent', 'karma:local']);
  grunt.registerTask('test', ['mochaTest:all']);
  grunt.registerTask('git-stage', [
    'gitadd:versionFiles',
    'gitcommit:version',
    'gittag:addtag',
    'changelog',
    'gitadd:changelog',
    'gitcommit:changelog'
  ]);
};
