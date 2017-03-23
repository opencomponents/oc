'use strict';

var format = require('stringformat');
var templateNotSupported = 'Error requiring the template "{0}": oc-template not found';

module.exports = function(type) {
  try {
    return require(type);
  } catch (err) {
    throw format(templateNotSupported, type);
  }
};