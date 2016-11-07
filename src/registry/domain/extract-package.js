'use strict';

var path = require('path');
var targz = require('targz');
var _ = require('underscore');

var getPackageJsonFromTempDir = require('./get-package-json-from-temp-dir');

module.exports = function(files, callback){

  var packageFile = files[_.keys(files)[0]],
      packagePath = path.resolve(packageFile.path),
      packageUntarOutput = path.resolve(packageFile.path, '..', packageFile.name.replace('.tar.gz', '')),
      packageOutput = path.resolve(packageUntarOutput, '_package');

  targz.decompress({
    src: packagePath,
    dest: packageUntarOutput
  }, function(err){

    if(err){ return callback(err); }

    getPackageJsonFromTempDir(packageOutput, function(err, packageJson){
      callback(err, {
        outputFolder: packageOutput,
        packageJson: packageJson
      });
    });
  });
};