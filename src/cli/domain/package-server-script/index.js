'use strict';

const fs = require('fs-extra');
const path = require('path');

const bundle = require('./bundle');
const hashBuilder = require('../../../utils/hash-builder');

module.exports = function packageServerScript(params, callback){
  const fileName = 'server.js';
  const publishPath = params.publishPath;
  const webpackParams = { stats: params.verbose ? 'verbose' : 'errors-only' };

  const bundleParams = {
    webpack: params.webpack || webpackParams,
    dependencies: params.dependencies || {},
    fileName: fileName,
    dataPath: path.join(params.componentPath, params.ocOptions.files.data)
  };

  bundle(bundleParams, (err, bundledServer) => {
    if (err) {
      return callback(err);
    } else {
      fs.writeFile(path.join(publishPath, fileName), bundledServer, (err) => {
        callback(err, {
          type: 'node.js',
          hashKey: hashBuilder.fromString(bundledServer),
          src: fileName
        });
      });
    }
  });
};
