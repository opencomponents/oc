'use strict';

module.exports = function(length, data) {
  return Array(length - String(data).length + 1).join('0') + data;
};
