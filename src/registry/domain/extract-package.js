'use strict';

const path = require('path');
const targz = require('targz');
const _ = require('lodash');

const getPackageJsonFromTempDir = require('./get-package-json-from-temp-dir');

module.exports = function(files, callback){

  const packageFile = files[_.keys(files)[0]],
    packagePath = path.resolve(packageFile.path),
    packageUntarOutput = path.resolve(packageFile.path, '..', packageFile.name.replace('.tar.gz', '')),
    packageOutput = path.resolve(packageUntarOutput, '_package');

  targz.decompress({
    src: packagePath,
    dest: packageUntarOutput
  }, (err) => {

    if(err){ return callback(err); }

    getPackageJsonFromTempDir(packageOutput, (err, packageJson) => {
      callback(err, {
        outputFolder: packageOutput,
        packageJson: packageJson
      });
    });
  });
};