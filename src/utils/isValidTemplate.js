'use strict';

module.exports = function isValidTemplate(template, options) {
  if (typeof template !== 'object') {
    return false;
  }

  let api = ['getInfo', 'getCompiledTemplate', 'render'];

  if (options.compiler === true) {
    api = api.concat('compile');
  }

  return api.every(method => typeof template[method] === 'function');
};
