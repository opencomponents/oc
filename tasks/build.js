'use strict';

const format = require('stringformat');
const fs = require('fs-extra');
const ocClientBrowser = require('oc-client-browser');
const path = require('path');
const packageJson = require('../package');

module.exports = function(grunt) {
  grunt.registerTask(
    'build',
    'Builds and minifies the oc-client component',
    function() {
      const done = this.async();
      const ocVersion = packageJson.version;
      const clientComponentDir = '../src/components/oc-client/';
      const ocClientPackageInfo = require(`${clientComponentDir}package.json`);

      fs.emptyDirSync(path.join(__dirname, clientComponentDir, 'src'));
      ocClientBrowser.getLib((err, libContent) => {
        if (err) {
          grunt.log['error'](err);
        }

        ocClientPackageInfo.version = ocVersion;
        fs.writeJsonSync(
          path.join(__dirname, clientComponentDir, 'package.json'),
          ocClientPackageInfo,
          { spaces: 2 }
        );

        fs.writeFileSync(
          path.join(__dirname, clientComponentDir, 'src/oc-client.min.js'),
          libContent
        );

        ocClientBrowser.getMap((err, mapContent) => {
          if (err) {
            grunt.log['error'](err);
          }
          fs.writeFileSync(
            path.join(__dirname, clientComponentDir, 'src/oc-client.min.map'),
            mapContent
          );

          const Local = require('../src/cli/domain/local'),
            local = new Local(),
            packageOptions = {
              componentPath: path.join(__dirname, clientComponentDir),
              verbose: false
            };

          local.package(packageOptions, err => {
            grunt.log[err ? 'error' : 'ok'](
              err ? err : 'Client has been built and packaged'
            );
            done();
          });
        });
      });
    }
  );
};
