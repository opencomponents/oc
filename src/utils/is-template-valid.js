'use strict';

const _ = require('lodash');

module.exports = function isTemplateValid(template, options) {
  if (!_.isObject(template)) {
    return false;
  }

  const api = ['getInfo', 'getCompiledTemplate', 'render'];

  if (options && options.compiler === true) {
    api.push('compile');
  }

  return api.every(method => _.isFunction(template[method]));
};
