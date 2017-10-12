'use strict';

const format = require('stringformat');
const path = require('path');

const cleanRequire = require('../../../utils/clean-require');
const isTemplateValid = require('../../../utils/is-template-valid');

const templateNotFound = 'Error requiring oc-template: "{0}" not found';
const templateNotValid =
  'Error requiring oc-template: "{0}" is not a valid oc-template';

module.exports = function(template, options) {
  const requireOptions = options || {};
  let ocTemplate;
  if (template === 'jade') {
    template = 'oc-template-jade';
  }
  if (template === 'handlebars') {
    template = 'oc-template-handlebars';
  }
  if (requireOptions.compiler === true) {
    template = template + '-compiler';
  }

  const localTemplate = path.join(
    __dirname,
    '../../',
    'node_modules',
    template
  );
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
    throw new Error(format(templateNotFound, template));
  }

  if (!isTemplateValid(ocTemplate, requireOptions)) {
    throw new Error(format(templateNotValid, template));
  }

  return ocTemplate;
};
