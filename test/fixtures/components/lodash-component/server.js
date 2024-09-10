'use strict';

var isequal = require('lodash.isequal');

module.exports.data = function (context, callback) {
  callback(null, {
    magicNumber: isequal(1, 1) ? 5 : 0
  });
};
