'use strict';

const path = require('path');
const scaffold = require('./scaffold');
const installTemplate = require('./install-template');
const createComponentDir = require('./create-component-dir');
const initPackage = require('./init-package');
const utils = require('./utils');

module.exports = function(options, callback) {
  const { componentName, templateType, logger = console } = options;
  const componentPath = path.join(process.cwd(), componentName);
  const local = /^\.+\/|^\//.test(templateType);
  const template = utils.getPackageName(templateType).replace('-compiler', '');
  const compiler = `${template}-compiler`;

  createComponentDir({ logger, componentName, componentPath });

  try {
    // If the required compiler is already installed locally no need to install it from NPM again
    const compilerPath = path.join(process.cwd(), 'node_modules', compiler);
    require(compilerPath);

    return scaffold({
      compiler,
      componentName,
      componentPath,
      compilerPath,
      logger,
      callback
    });
  } catch (error) {
    initPackage({ componentPath });
    return installTemplate(
      {
        componentName,
        templateType,
        compiler,
        componentPath,
        local,
        template,
        logger,
        callback
      },
      scaffold
    );
  }
};
