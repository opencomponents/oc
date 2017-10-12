'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const requireTemplate = require('./handle-dependencies/require-template');
const validator = require('../../registry/domain/validators');

module.exports = function() {
  return function(options, callback) {
    const production = options.production;
    const componentPath = options.componentPath;
    const minify = options.minify === true;
    const verbose = options.verbose === true;
    const publishPath = path.join(componentPath, '_package');
    const componentPackagePath = path.join(componentPath, 'package.json');
    const ocPackagePath = path.join(__dirname, '../../../package.json');

    if (!fs.existsSync(componentPackagePath)) {
      return callback(new Error('component does not contain package.json'));
    } else if (!fs.existsSync(ocPackagePath)) {
      return callback(new Error('error resolving oc internal dependencies'));
    }

    fs.emptyDirSync(publishPath);

    const componentPackage = fs.readJsonSync(componentPackagePath);
    const ocPackage = fs.readJsonSync(ocPackagePath);

    if (!validator.validateComponentName(componentPackage.name)) {
      return callback(new Error('name not valid'));
    }

    const type = componentPackage.oc.files.template.type;
    const compileOptions = {
      publishPath,
      componentPath,
      componentPackage,
      ocPackage,
      minify,
      verbose,
      production
      // TODO: logger,
      // TODO: watch,
    };

    try {
      const ocTemplate = requireTemplate(type, {
        compiler: true,
        componentPath
      });
      ocTemplate.compile(compileOptions, callback);
    } catch (err) {
      return callback(err);
    }
  };
};
