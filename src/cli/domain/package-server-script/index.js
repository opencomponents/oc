'use strict';

var async = require('async');
var fs = require('fs-extra');
var path = require('path');

var bundle = require('./bundle');
var hashBuilder = require('../../../utils/hash-builder');

module.exports = function packageServerScript(params, callback){
  var fileName = 'server.js';
  var publishPath = params.publishPath;
  var webpackParams = { stats: params.verbose ? 'verbose' : 'errors-only' };

  var bundleParams = {
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
