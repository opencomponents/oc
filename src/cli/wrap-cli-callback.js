'use strict';

const _ = require('lodash');

module.exports = function(callback) {
  if (_.isFunction(callback)) {
    return callback;
  }

  return function(error) {
    if (error) {
      return process.exit(1);
    }
  };
};
