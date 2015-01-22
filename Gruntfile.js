'use strict';

var fs = require('fs-extra');
var path = require('path');
var uglifyJs = require('uglify-js');

module.exports = function(grunt) {

  if (!grunt.option('versionNumber')) {
    grunt.option('versionNumber', '1.0.0');
  }

  var taskObject = {
    pkg: grunt.file.readJSON('package.json')
  };

  grunt.file.expand('grunt-tasks/*.js', '!grunt-tasks/_*.js').forEach(function(file) {
    var name = file.split('/');
    name = name[name.length - 1].replace('.js', '');
    taskObject[name] = require('./'+ file);
  });

  grunt.initConfig(taskObject);
  require('load-grunt-tasks')(grunt);

  // default task
  grunt.registerTask('default', ['test', 'build']);

  // build task
  grunt.registerTask('build', ['build-web-client']);

  // Setup the precommit hook
  grunt.registerTask('hooks', ['githooks:all']);

  // test
  grunt.registerTask('test', ['jshint:all', 'mochaTest:unit', 'mochaTest:acceptance']);

  // custom tasks
  grunt.registerTask('build-web-client', 'Builds and minifies the web-client.js', function(){

    var done = this.async();
    var handlebars = fs.readFileSync(path.join(__dirname, 'registry/public/handlebars.1.3.0.js')).toString();
    var ocClient = fs.readFileSync(path.join(__dirname, 'registry/public/oc-client.js')).toString();

    fs.writeFile(path.join(__dirname, 'registry/public/oc-client.min.js'), uglifyJs.minify(handlebars + '\n' + ocClient, {fromString: true}).code, function(err, res){
      grunt.log.ok('Web-client created.');
      done();
    });
  });

};
