'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var uglifyJs = require('uglify-js');

module.exports = function(grunt, taskObject){

  return function(){

    var done = this.async(),
        version = taskObject.pkg.version,
        clientComponentDir = '../../components/oc-client/',
        licenseRow = '/*! OpenComponents client v{0} | (c) 2015-{1} OpenTable, Inc. | {2} */',
        licenseLink = 'https://github.com/opentable/oc/tree/master/components/oc-client/LICENSES.md',
        license = format(licenseRow, version, new Date().getFullYear(), licenseLink),
        headLoad = fs.readFileSync(path.join(__dirname, clientComponentDir, 'src/head.load.js')).toString(),
        ocClient = fs.readFileSync(path.join(__dirname, clientComponentDir, 'src/oc-client.js')).toString(),
        bundle = format('{0}\n;\n{1}\n;\noc.clientVersion=\'{2}\';', headLoad, ocClient, version),
        ocClientPackageInfo = require(clientComponentDir + 'package.json');

    ocClientPackageInfo.version = version;
    fs.writeJsonSync(path.join(__dirname, clientComponentDir, 'package.json'), ocClientPackageInfo, {spaces: 2});

    var compressed = uglifyJs.minify(bundle, {
      fromString: true,
      outSourceMap: 'oc-client.min.map'
    });

    var compressedCode = format('{0}\n{1}', license, compressed.code);

    fs.writeFileSync(path.join(__dirname, clientComponentDir, 'src/oc-client.min.js'), compressedCode);
    fs.writeFileSync(path.join(__dirname, clientComponentDir, 'src/oc-client.min.map'), compressed.map);
    fs.writeFileSync(path.join(__dirname, '../../client/src/oc-client.min.js'), compressedCode);

    var Local = require('../../cli/domain/local'),
        local = new Local({ logger: { log: grunt.log.writeln }});

    local.package(path.join(__dirname, clientComponentDir), function(err, res){
      grunt.log[!!err ? 'error' : 'ok'](!!err ? err : 'Client has been built and packaged');
      done();
    });
  };
};