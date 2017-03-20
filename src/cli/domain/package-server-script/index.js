'use strict';

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

  bundle(bundleParams, function(err, bundledServer){
    if (err) {
      return callback(err);
    } else {
      fs.writeFile(path.join(publishPath, fileName), bundledServer, function(err, res){
        callback(err, {
          type: 'node.js',
          hashKey: hashBuilder.fromString(bundledServer),
          src: fileName
        });
      });
    }
  });
};
