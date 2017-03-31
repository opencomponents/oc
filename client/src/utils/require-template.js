'use strict';

var format = require('stringformat');
var fs = require('fs');
var path = require('path');

var templateNotSupported = 'Error loading component: template "{0}" not supported';

module.exports = function(template) {
  var localTemplate = path.join(__dirname, '../../', 'node_modules', template);
  if (fs.existsSync(localTemplate)) {
    return require(localTemplate);
  }

  var relativeTemplate = path.resolve('.', 'node_modules', template);
  if (fs.existsSync(relativeTemplate)) {
    return require(relativeTemplate);
  }

  throw format(templateNotSupported, template);
};
