'use strict';

const fs = require('fs-extra');
const path = require('path');

const strings = require('../../../resources');

module.exports = function scaffold(options, callback) {
  const {
    compiler,
    compilerPath,
    componentName,
    componentPath,
    templateType
  } = options;

  const baseComponentPath = path.join(compilerPath, 'scaffold');
  const baseComponentFiles = path.join(baseComponentPath, 'src');
  const compilerPackage = fs.readJSONSync(
    path.join(compilerPath, 'package.json')
  );

  try {
    fs.copySync(baseComponentFiles, componentPath);

    const componentPackage = fs.readJSONSync(
      path.join(componentPath, 'package.json')
    );
    componentPackage.name = componentName;
    componentPackage.devDependencies[compiler] = compilerPackage.version;
    fs.writeJsonSync(componentPath + '/package.json', componentPackage, {
      spaces: 2
    });

    return callback(null, { ok: true });
  } catch (error) {
    const url =
      (compilerPackage.bugs && compilerPackage.bugs.url) ||
      `the ${templateType} repo`;
    return callback(strings.errors.cli.scaffoldError(url, error));
  }
};
