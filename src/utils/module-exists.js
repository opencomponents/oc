'use strict';

const tryRequire = require('try-require');
const path = require('path');

module.exports = (moduleName) => {
  const packageModulePath = path.join(moduleName, 'package.json');

  if (require.cache && !!require.cache[packageModulePath]) {
    delete require.cache[packageModulePath];
  }

  return (
    !!tryRequire.resolve(moduleName) || !!tryRequire.resolve(packageModulePath)
  );
};
