'use strict';

const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function() {
  return function(opts, callback) {
    callback = wrapCliCallback(callback);
    callback(null, 'ok');
  };
};
