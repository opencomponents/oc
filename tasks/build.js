'use strict';

const format = require('stringformat');
const fs = require('fs-extra');
const ocClientBrowser = require('oc-client-browser');
const path = require('path');
const uglifyJs = require('uglify-js');

module.exports = function(grunt) {
  grunt.registerTask(
    'build',
    'Builds and minifies the oc-client component',
    function() {
      const done = this.async();
      const clientComponentDir = '../src/components/oc-client/';

      fs.emptyDirSync(path.join(__dirname, clientComponentDir, 'src'));
      ocClientBrowser.getLib((err, libContent) => {
        if (err) {
          grunt.log['error'](err);
        }
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
