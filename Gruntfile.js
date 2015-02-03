'use strict';

var format = require('./utils/format');
var fs = require('fs-extra');
var path = require('path');
var semver = require('semver');
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

    var done = this.async(),
        handlebarsRuntime = fs.readFileSync(path.join(__dirname, 'node_modules/handlebars/dist/handlebars.runtime.min.js')).toString(),
        jadeRuntime = fs.readFileSync(path.join(__dirname, 'node_modules/jade/runtime.js')).toString(),
        ocClient = fs.readFileSync(path.join(__dirname, 'components/oc-client/src/oc-client.js')).toString(),
        bundle = format('{0};{1};{2};oc.clientVersion=\'{3};\'', jadeRuntime, handlebarsRuntime, ocClient, taskObject.pkg.version),
        ocClientPackageInfo = require('./components/oc-client/package.json');

    ocClientPackageInfo.version = taskObject.pkg.version;

    fs.writeJsonSync(path.join(__dirname, 'components/oc-client/package.json'), ocClientPackageInfo);
    fs.writeFileSync(path.join(__dirname, 'components/oc-client/src/oc-client.min.js'), uglifyJs.minify(bundle, {fromString: true}).code);

    var Local = require('./cli/domain/local'),
        local = new Local();

    local.package(path.join(__dirname, 'components/oc-client'), function(err, res){
      grunt.log[!!err ? 'error' : 'ok'](!!err ? err : 'Client has been built and packaged');
      done();
    });
  });

  // used for version patching
  grunt.registerTask('version', 'Does the version upgrade', function(versionType){
    
    taskObject.pkg.version = semver.inc(taskObject.pkg.version, versionType);

    grunt.log.ok('Package version upgrading to: ' + taskObject.pkg.version);

    fs.writeJsonSync('package.json', taskObject.pkg);

    grunt.task.run([
      'test',
      'build'
    ]);
  });

};
