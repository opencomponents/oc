'use strict';

const format = require('stringformat');

const strings = require('../../../resources');

module.exports = (options, cb) => {
  const { componentPath, pkg, template } = options;
  const compilerDep = `${template}-compiler`;
  const isOk = pkg.devDependencies[compilerDep];

  const err = isOk
    ? null
    : format(strings.errors.cli.TEMPLATE_DEP_MISSING, template, componentPath);

  cb(err, compilerDep);
};
