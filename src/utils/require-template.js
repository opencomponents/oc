'use strict';

var format = require('stringformat');
var path = require('path');
var fs = require('fs');

var templateNotSupported = 'Error requiring the template "{0}": oc-template not found';

module.exports = function(template) {
  var localTemplate = path.join(__dirname, '../../', 'node_modules', template);
  var relativeTemplate = path.resolve('.', 'node_modules', template);

  try {
    if (!!require.cache[localTemplate]) {
      delete require.cache[localTemplate];
    }
    return require(localTemplate);
  } catch(err) {
    try {
      if (!!require.cache[relativeTemplate]) {
        delete require.cache[relativeTemplate];
      }
      return require(relativeTemplate);
    } catch (err) {
      throw format(templateNotSupported, template);
    }
  }
};
