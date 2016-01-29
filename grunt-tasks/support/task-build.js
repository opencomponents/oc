'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var uglifyJs = require('uglify-js');

module.exports = function(grunt, taskObject){

  return function(){

    var done = this.async(),
        clientComponentDir = '../../components/oc-client/',
        headLoad = fs.readFileSync(path.join(__dirname, clientComponentDir, 'src/head.load.js')).toString(),
        ocClient = fs.readFileSync(path.join(__dirname, clientComponentDir, 'src/oc-client.js')).toString(),
        bundle = format('{0}\n;\n{1}\n;\noc.clientVersion=\'{2}\';', headLoad, ocClient, taskObject.pkg.version),
        ocClientPackageInfo = require(clientComponentDir + 'package.json');

    ocClientPackageInfo.version = taskObject.pkg.version;
    fs.writeJsonSync(path.join(__dirname, clientComponentDir, 'package.json'), ocClientPackageInfo, {spaces: 2});

    var compressed = uglifyJs.minify(bundle, {
      fromString: true,
      outSourceMap: 'oc-client.min.map'
    });

    fs.writeFileSync(path.join(__dirname, clientComponentDir, 'src/oc-client.min.js'), compressed.code);
    fs.writeFileSync(path.join(__dirname, clientComponentDir, 'src/oc-client.min.map'), compressed.map);
    fs.writeFileSync(path.join(__dirname, '../../client/src/oc-client.min.js'), compressed.code);

    var Local = require('../../cli/domain/local'),
        local = new Local({ logger: { log: grunt.log.writeln }});

    local.package(path.join(__dirname, clientComponentDir), function(err, res){
      grunt.log[!!err ? 'error' : 'ok'](!!err ? err : 'Client has been built and packaged');
      done();
    });
  };
};