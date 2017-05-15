'use strict';

const path = require('path');

const bundle = require('./bundle');

module.exports = function packageServerScript(params, callback){
  const webpackParams = { stats: params.verbose ? 'verbose' : 'errors-only' };

  const bundleParams = {
    webpack: params.webpack || webpackParams,
    dependencies: params.dependencies || {},
    fileName: params.ocOptions.files.data,
    dataPath: path.join(params.componentPath, params.ocOptions.files.data)
  };

  bundle(bundleParams, (err, bundledServer) => {
    if (err) {
      return callback(err);
    } else {
      return callback(null, bundledServer);
    }
  });
};
