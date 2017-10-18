'use strict';

const format = require('stringformat');
const path = require('path');

const cleanRequire = require('../../../utils/clean-require');
const isTemplateLegacy = require('./is-template-legacy');
const isTemplateValid = require('../../../utils/is-template-valid');
const strings = require('../../../resources');

module.exports = function(template, options) {
  const requireOptions = options || {};
  let ocTemplate;

  if (isTemplateLegacy(template)) {
    template = `oc-template-${template}`;
  }

  if (requireOptions.compiler) {
    template = `${template}-compiler`;
  }

  const localTemplate = path.join(__dirname, '../../node_modules', template);
  const relativeTemplate = path.resolve('.', 'node_modules', template);
  const componentRelativePath = path.join(
    requireOptions.componentPath,
    'node_modules',
    template
  );

  [
    componentRelativePath,
    template,
    localTemplate,
    relativeTemplate
  ].forEach(pathToTry => {
    ocTemplate = ocTemplate || cleanRequire(pathToTry, { justTry: true });
  });

  if (!ocTemplate) {
    throw new Error(format(strings.errors.cli.TEMPLATE_NOT_FOUND, template));
  }

  if (!isTemplateValid(ocTemplate, requireOptions)) {
    throw new Error(
      format(strings.errors.cli.TEMPLATE_TYPE_NOT_VALID, template)
    );
  }

  return ocTemplate;
};
