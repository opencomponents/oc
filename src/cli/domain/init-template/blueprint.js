'use strict';

const fs = require('fs-extra');
const path = require('path');
const colors = require('colors/safe');
const Spinner = require('cli-spinner').Spinner;

module.exports = function blueprint(config) {
  const componentName =  config.componentName;
  const componentPath = config.componentPath;
  const templatePath = config.templatePath;
  const callback = config.callback;
  const logger = config.logger;

  try {
    const bluprinting = new Spinner(`Blueprinting component...`);
    bluprinting.start();

    const baseComponentPath = path.join(
      templatePath,
      'blueprint'
    );

    const baseComponentFiles = path.join(baseComponentPath, 'src');
    fs.copySync(baseComponentFiles, componentPath);

    const packageContent = require(baseComponentPath + '/src/package');
    const initializedPackage = require(componentPath + '/package.json');
    const templatePackage = require(templatePath + '/package.json');

    packageContent.name = componentName;
    packageContent.dependencies = initializedPackage.dependencies;
    packageContent.dependencies[templatePackage.name] = templatePackage.version;

    fs.writeJsonSync(componentPath + '/package.json', packageContent);
    bluprinting.stop();
    logger.log(`${colors.green('✔')} Files created at ${componentPath}`);
    return callback(null, { ok: true });
  } catch (error) {
    return callback(`Blueprinting failed. Please open an issue on ${templatePackage.bugs.url} with the following information: ${error}`);
  }
};
