'use strict';

const path = require('path');
const _ = require('underscore');

const blueprint = require('./blueprint');
const installTemplate = require('./installTemplate');
const createComponentDir = require('./createComponentDir');
const initPackage = require('./initPackage');
const utils = require('./utils');

module.exports = function (componentName, templateType, options, callback) {
  const config = {
    cli: options.cli || 'npm',
    componentName,
    componentPath: path.join(process.cwd(), componentName ),
    templateType,
    packageName: utils.getPackageName(templateType),
    logger: options.logger || console,
    callback,
    local: /^\.\/|^\//.test(templateType)
  };

  createComponentDir(config);

  try {
    // If template available in the dev registry, generate boilerplate out of its blueprint
    const templatePath = path.resolve('node_modules', config.packageName);
    require(templatePath);
    blueprint(_.extend({}, config, { templatePath }));
  } catch (e) {
    // Otherwise install the template
    initPackage(config);
    const templatePath = path.resolve(process.cwd(), config.templateType);
    installTemplate(_.extend({}, config, { templatePath }), blueprint);
  }
};
