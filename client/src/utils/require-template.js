'use strict';

var format = require('stringformat');
var templateNotSupported = 'Error loading component: template "{0}" not supported';

module.exports = function(type) {
  try {
    return require(type);
  } catch (err) {
    throw format(templateNotSupported, type);
  }
};