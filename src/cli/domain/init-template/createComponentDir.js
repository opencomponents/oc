'use strict';

const Spinner = require('cli-spinner').Spinner;
const fs = require('fs-extra');
const colors = require('colors/safe');
const strings = require('../../../resources');

module.exports = function(config) {
  const logger = config.logger;
  const componentName = config.componentName;
  const componentPath = config.componentPath;

  const creating = new Spinner(`Creating directory...`);
  creating.start();
  fs.ensureDirSync(componentPath);
  creating.stop(true);
  logger.log(strings.messages.cli.BlUEPRINT_CREATED_DIR(componentName));
};
