'use strict';

module.exports = function() {
  return new Date(new Date().setYear(new Date().getFullYear() + 1));
};
