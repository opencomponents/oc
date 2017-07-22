'use strict';

const Spinner = require('cli-spinner').Spinner;
const fs = require('fs-extra');
const strings = require('../../../resources');

module.exports = function(options) {
  const { logger, componentName, componentPath } = options;

  const create = new Spinner(strings.messages.cli.creatingDir());
  create.start();
  fs.ensureDirSync(componentPath);
  create.stop(true);
};
