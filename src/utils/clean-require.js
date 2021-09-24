'use strict';

const tryRequire = require('try-require');

module.exports = (path, { justTry = false, resolve = false }) => {
  const shouldThrow = !justTry;
  if (require.cache && !!require.cache[path]) {
    delete require.cache[path];
  }

  let action = shouldThrow ? require : tryRequire;
  if (resolve) {
    action = action.resolve;
  }

  return action(path);
};
