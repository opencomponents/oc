'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const createComponentDir = require('./create-component-dir');
const initPackage = require('./init-package');
const installTemplate = require('./install-template');
const scaffold = require('./scaffold');

module.exports = function(options, callback) {
  const {
    templateType,
    componentName,
    logger,
    componentPath,
    compiler
  } = options;

  createComponentDir({ componentPath });

  const compilerInstalledOnDevRegistryPath = path.join(
    process.cwd(),
    'node_modules',
    compiler
  );
  const compilerInstalledOnComponentPath = path.join(
    componentPath,
    'node_modules',
    compiler
  );
  fs.stat(compilerInstalledOnDevRegistryPath, (err, stats) => {
    if (err) {
      initPackage({ componentPath });
      return installTemplate(options, (err, done) => {
        if (err) {
          return callback(err);
        }
        return scaffold(
          _.extend(options, { compilerPath: compilerInstalledOnComponentPath }),
          (err, done) => {
            if (err) {
              return callback(err);
            }
            return callback(null, done);
          }
        );
      });
    }
    return scaffold(
      _.extend(options, { compilerPath: compilerInstalledOnDevRegistryPath }),
      (err, done) => {
        if (err) {
          return callback(err);
        }
        return callback(null, done);
      }
    );
  });
};
