'use strict';

const format = require('stringformat');
const path = require('path');

const templateNotFound = 'Error requiring oc-template: "{0}" not found';
const templateNotValid = 'Error requiring oc-template: "{0}" is not a valid oc-template';

function isValidTemplate(template) {
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

const getOcTemplate = (path) => {
  if (require.cache && !!require.cache[path]) {
    delete require.cache[path];
  }
  return require(path);
};

module.exports = function (template) {
  let ocTemplate;
  const localTemplate = path.join(__dirname, '../../', 'node_modules', template);
  const relativeTemplate = path.resolve('.', 'node_modules', template);

  try {
    ocTemplate = getOcTemplate(template);
  } catch (err) {
    try {
      ocTemplate = getOcTemplate(localTemplate);
    } catch (err) {
      try {
        ocTemplate = getOcTemplate(relativeTemplate);
      } catch (err) {
        throw new Error(format(templateNotFound, template));
      }
    }
  }

  if (!isValidTemplate(ocTemplate)) {
    throw new Error(format(templateNotValid, template));
  }

  return ocTemplate;
};
