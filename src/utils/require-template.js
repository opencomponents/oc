'use strict';

const format = require('stringformat');
const path = require('path');

const templateNotFound = 'Error requiring oc-template: "{0}" not found';
const templateNotValid = 'Error requiring oc-template: "{0}" is not a valid oc-template';

function isValidTemplate(template, options){
  if (typeof template !== 'object') {
    return false;
  }

  if (options.compiler === true) {
    return typeof template.compile === 'function';
  }

  return [
    'getInfo',
    'getCompiledTemplate',
    'render'
  ].every((method) => typeof template[method] === 'function');
}

module.exports = function(template, options) {
  requireOptions = options || {};
  let ocTemplate;
  if (template === 'jade') { template = 'oc-template-jade'; }
  if (template === 'handlebars') { template = 'oc-template-handlebars'; }
  if (requireOptions.compiler === true) { template = template + '-compiler'; }

  const localTemplate = path.join(__dirname, '../../', 'node_modules', template);
  const relativeTemplate = path.resolve('.', 'node_modules', template);

  try {
    if (require.cache && !!require.cache[localTemplate]) {
      delete require.cache[localTemplate];
    }
    ocTemplate = require(localTemplate);
  } catch(err) {
    try {
      if (require.cache && !!require.cache[relativeTemplate]) {
        delete require.cache[relativeTemplate];
      }
      ocTemplate = require(relativeTemplate);
    } catch (err) {
      throw format(templateNotFound, template);
    }
  }

  if (!isValidTemplate(ocTemplate, requireOptions)) {
    throw format(templateNotValid, template);
  }

  return ocTemplate;
};
