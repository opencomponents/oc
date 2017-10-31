'use strict';

const tryRequire = require('try-require');

module.exports = (path, { justTry }) => {
  const shouldThrow = !justTry;
  if (require.cache && !!require.cache[path]) {
    delete require.cache[path];
  }
  return shouldThrow ? require(path) : tryRequire(path);
};
