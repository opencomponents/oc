'use strict';

const format = require('stringformat');
const path = require('path');

const templateNotFound = 'Error requiring oc-template: "{0}" not found';
const templateNotValid =
  'Error requiring oc-template: "{0}" is not a valid oc-template';

function isValidTemplate(template) {
  if (typeof template !== 'object') {
    return false;
  }

  return ['getInfo', 'getCompiledTemplate', 'render'].every(
    method => typeof template[method] === 'function'
  );
}

module.exports = function(template) {
  let ocTemplate;
  if (template === 'jade') {
    template = 'oc-template-jade';
  }
  if (template === 'handlebars') {
    template = 'oc-template-handlebars';
  }

  const templatePath = path.join(
    __dirname,
    '../../../',
    'node_modules',
    template
  );

  try {
    if (require.cache && !!require.cache[templatePath]) {
      delete require.cache[templatePath];
    }
    ocTemplate = require(templatePath);
  } catch (err) {
    throw format(templateNotFound, templatePath);
  }

  if (!isValidTemplate(ocTemplate)) {
    throw format(templateNotValid, template);
  }

  return ocTemplate;
};
