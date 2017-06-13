'use strict';

const path = require('path');
const targz = require('targz');

const getPackageJsonFromTempDir = require('./get-package-json-from-temp-dir');

module.exports = function(files, callback) {
  const packageFile = files[0],
    packagePath = path.resolve(packageFile.path),
    packageUntarOutput = path.resolve(
      packageFile.path,
      '..',
      packageFile.filename.replace('.tar.gz', '')
    ),
    packageOutput = path.resolve(packageUntarOutput, '_package');

  targz.decompress(
    {
      src: packagePath,
      dest: packageUntarOutput
    },
    err => {
      if (err) {
        return callback(err);
      }

      getPackageJsonFromTempDir(packageOutput, (err, packageJson) => {
        callback(err, {
          outputFolder: packageOutput,
          packageJson: packageJson
        });
      });
    }
  );
};
