'use strict';

var customTasks = {
  build: require('./grunt-tasks/support/task-build'),
  clientVersion: require('./grunt-tasks/support/task-client-version'),
  generateCliDoc: require('./grunt-tasks/support/task-generate-cli-doc'),
  version: require('./grunt-tasks/support/task-version')
};

module.exports = function(grunt){

  var taskObject = { pkg: grunt.file.readJSON('package.json') },
      clientPkg = grunt.file.readJSON('./client/package.json');

  grunt.file.expand('grunt-tasks/*.js', '!grunt-tasks/_*.js').forEach(function(file) {
    var name = file.split('/');
    name = name[name.length - 1].replace('.js', '');
    taskObject[name] = require('./'+ file);
  });

  grunt.initConfig(taskObject);
  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', ['test-local', 'build']);
  grunt.registerTask('sauce', ['karma:sauce-linux', 'karma:sauce-osx', 'karma:sauce-windows']);
  grunt.registerTask('test-local', ['jshint:all', 'mochaTest:unit', 'mochaTest:acceptance', 'karma:local']);
  grunt.registerTask('test-local-silent', ['jshint:all', 'mochaTest:silent', 'karma:local']);
  grunt.registerTask('test', ['jshint:all', 'mochaTest:unit', 'mochaTest:acceptance']);

  grunt.registerTask('git-stage', [
    'gitadd:all',
    'gitcommit:version',
    'gittag:addtag',
    'githubChanges',
    'gitadd:changelog',
    'gitcommit:changelog'
  ]);
  
  grunt.registerTask('git-stage-client', ['gitadd:all', 'gitcommit:client']);

  grunt.registerTask('build', 'Builds and minifies the oc-client component', customTasks.build(grunt, taskObject));
  grunt.registerTask('generate-cli-doc', 'Automatically updates the cli.md file', customTasks.generateCliDoc);
  grunt.registerTask('version', 'Upgrades the library', customTasks.version(grunt, taskObject));
  grunt.registerTask('client-version', 'Upgrades the node.js client', customTasks.clientVersion(grunt, clientPkg));
};
