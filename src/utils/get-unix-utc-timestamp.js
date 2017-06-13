'use strict';

module.exports = function() {
  const d1 = new Date(),
    d2 = new Date(
      d1.getUTCFullYear(),
      d1.getUTCMonth(),
      d1.getUTCDate(),
      d1.getUTCHours(),
      d1.getUTCMinutes(),
      d1.getUTCSeconds(),
      d1.getUTCMilliseconds()
    );

  return Math.floor(d2.getTime());
};
