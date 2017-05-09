'use strict';

const path = require('path');
const _ = require('underscore');

const blueprint = require('./blueprint');
const installTemplate = require('./installTemplate');
const createComponentDir = require('./createComponentDir');
const initPackage = require('./initPackage');
const utils = require('./utils');

module.exports = function (componentName, templateType, options, callback) {
  const local = /^\.+\/|^\//.test(templateType);
  const packageName=  utils.getPackageName(templateType);
  const templatePath = path.resolve('node_modules', packageName);
  const config = {
    cli: options.cli || 'npm',
    componentName,
    componentPath: path.join(process.cwd(), componentName),
    packageName,
    templatePath,
    templateType,
    logger: options.logger || console,
    callback,
    local
  };

  createComponentDir(config);

  try {
    // If template available in the dev registry, generate boilerplate out of its blueprint
    require(templatePath);
    return blueprint(config);
  } catch (e) {
    // Otherwise, first install the template then generate boilerplate files.
    initPackage(config);
    return installTemplate(config, blueprint);
  }
};
