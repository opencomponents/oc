'use strict';

const fs = require('fs-extra');
const path = require('path');
const Spinner = require('cli-spinner').Spinner;
const strings = require('../../../resources');

module.exports = function scaffold(options) {
  const {
    componentName,
    componentPath,
    compilerPath,
    callback,
    compiler,
    logger
  } = options;
  const compilerPackage = require(compilerPath + '/package.json');

  try {
    const scaffold = new Spinner(strings.messages.cli.startScaffold());

    scaffold.start();
    const baseComponentPath = path.join(compilerPath, 'scaffold');
    const baseComponentFiles = path.join(baseComponentPath, 'src');

    fs.copySync(baseComponentFiles, componentPath);

    const componentPackage = require(componentPath + '/package.json');
    componentPackage.name = componentName;
    componentPackage.devDependencies[compiler] = compilerPackage.version;
    fs.writeJsonSync(componentPath + '/package.json', componentPackage);

    scaffold.stop();
    // logger.log(strings.messages.cli.scaffoldSuccess(componentPath));

    return callback(null, { ok: true });
  } catch (error) {
    const url =
      (compilerPackage.bugs && compilerPackage.bugs.url) ||
      `the ${compilerPackage.name.replace('-compiler', '')} repo`;
    return callback(strings.errors.cli.scaffoldError(url, error));
  }
};
