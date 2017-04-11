'use strict';

const format = require('stringformat');
const path = require('path');

const templateNotFound = 'Error requiring oc-template: "{0}" not found';
const templateNotValid = 'Error requiring oc-template: "{0}" is not a valid oc-template';

function isValidTemplate(template){
  if (typeof template !== 'object') {
    return false;
  }

  return [
    'getInfo',
    'getCompiledTemplate',
    'compile',
    'render'
  ].every((method) => template[method]);
}


module.exports = function(template) {
  let ocTemplate;
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

  if (!isValidTemplate(ocTemplate)) {
    throw format(templateNotValid, template);
  }

  return ocTemplate;
};
