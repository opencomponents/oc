'use strict';

var format = require('stringformat');
var path = require('path');
var fs = require('fs');

var templateNotSupported = 'Error requiring the template "{0}": oc-template not found';

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
