'use strict';

const strings = require('../../../resources').default;

module.exports = (options, cb) => {
  const { componentPath, pkg, template } = options;
  const compilerDep = `${template}-compiler`;
  const isOk = pkg.devDependencies[compilerDep];

  const err = isOk
    ? null
    : strings.errors.cli.TEMPLATE_DEP_MISSING(template, componentPath);

  cb(err, compilerDep);
};
