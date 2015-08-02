'use strict';

global.__BASE = __dirname;
var commandsParser = require('./grunt-tasks/support/cli-commands-parser');
var format = require('stringformat');
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

  // test
  grunt.registerTask('sauce', ['karma:sauce-linux', 'karma:sauce-osx', 'karma:sauce-windows']);
  grunt.registerTask('test-local', ['jshint:all', 'mochaTest:unit', 'mochaTest:acceptance', 'karma:local']);
  grunt.registerTask('test', ['jshint:all', 'mochaTest:unit', 'mochaTest:acceptance', 'sauce']);
  grunt.registerTask('test-windows', ['jshint:all', 'mochaTest:unit', 'mochaTest:acceptance']);

  // custom tasks
  grunt.registerTask('build', 'Builds and minifies the oc-client component', function(){

    var done = this.async(),
        headLoad = fs.readFileSync(path.join(__dirname, 'components/oc-client/src/head.load.js')).toString(),
        ocClient = fs.readFileSync(path.join(__dirname, 'components/oc-client/src/oc-client.js')).toString(),
        bundle = format('{0}\n;\n{1}\n;\noc.clientVersion=\'{2}\';', headLoad, ocClient, taskObject.pkg.version),
        ocClientPackageInfo = require('./components/oc-client/package.json');

    ocClientPackageInfo.version = taskObject.pkg.version;

    fs.writeJsonSync(path.join(__dirname, 'components/oc-client/package.json'), ocClientPackageInfo);

    var compressedClientLibrary = uglifyJs.minify(bundle, {fromString: true}).code;

    fs.writeFileSync(path.join(__dirname, 'components/oc-client/src/oc-client.min.js'), compressedClientLibrary);
    fs.writeFileSync(path.join(__dirname, 'client/oc-client.min.js'), compressedClientLibrary);

    var Local = require('./cli/domain/local'),
        local = new Local();

    local.package(path.join(__dirname, 'components/oc-client'), function(err, res){
      grunt.log[!!err ? 'error' : 'ok'](!!err ? err : 'Client has been built and packaged');
      done();
    });
  });

  grunt.registerTask('generate-cli-doc', 'Automatically updates the cli.md file', function(){

    var parsed = commandsParser.parse(),
        data = fs.readFileSync('./grunt-tasks/support/cli-template.md', 'utf8'),
        newFileData = data.replace('[commands-shortlist]', parsed.commandList).replace('[commands-detailed]', parsed.detailedCommandList);

    fs.writeFileSync('./docs/cli.md', newFileData);
  });

  // used for version patching
  grunt.registerTask('version', 'Does the version upgrade', function(versionType){

    taskObject.pkg.version = semver.inc(taskObject.pkg.version, versionType);

    grunt.log.ok('Package version upgrading to: ' + taskObject.pkg.version);

    fs.writeJsonSync('package.json', taskObject.pkg);

    grunt.task.run([
      'test-local',
      'generate-cli-doc',
      'build'
    ]);
  });

};
