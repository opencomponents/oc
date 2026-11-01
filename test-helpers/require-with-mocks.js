const Module = require('node:module');

module.exports = function requireWithMocks(resolvedPath, mocks) {
  const originalLoad = Module._load;

  Module._load = function (request, parent, isMain) {
    if (parent?.filename === resolvedPath && Object.hasOwn(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[resolvedPath];
    return require(resolvedPath);
  } finally {
    Module._load = originalLoad;
    delete require.cache[resolvedPath];
  }
};
