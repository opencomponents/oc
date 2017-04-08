'use strict';

const async = require('async');
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

  bundle(bundleParams, function(err, bundledFiles){
    if (err) {
      return callback(err);
    } else {
      async.eachOf(bundledFiles, function(bundledFileContent, bundledFileName, next){
        fs.writeFile(path.join(publishPath, bundledFileName), bundledFileContent, next);
      }, function(err){
        callback(err, {
          type: 'node.js',
          hashKey: hashBuilder.fromString(bundledFiles[fileName]),
          src: fileName
        });
      });
    }
  });
};
