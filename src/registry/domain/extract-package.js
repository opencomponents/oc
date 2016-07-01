'use strict';

var path = require('path');
var Targz = require('tar.gz');
var _ = require('underscore');

var getPackageJsonFromTempDir = require('./get-package-json-from-temp-dir');

var targz = new Targz();

module.exports = function(files, callback){

  var packageFile = files[_.keys(files)[0]],
      packagePath = path.resolve(packageFile.path),
      packageUntarOutput = path.resolve(packageFile.path, '..', packageFile.name.replace('.tar.gz', '')),
      packageOutput = path.resolve(packageUntarOutput, '_package');

  targz.extract(packagePath, packageUntarOutput, function(err){

    if(err){ return callback(err); }

    getPackageJsonFromTempDir(packageUntarOutput, function(err, packageJson){
      callback(err, {
        outputFolder: packageOutput,
        packageJson: packageJson
      });
    });
  });
};