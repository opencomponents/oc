/*jshint camelcase:false */
'use strict';
var _ = require('underscore');
var config = require('./webpack.server.config');
var console = require('console');
var MemoryFS = require('memory-fs');
var path = require('path');
var webpack = require('webpack');

var memoryFs = new MemoryFS();

function bundle(dataPath, fileName, options, callBack) {
  if (typeof options === 'function') {
    callBack = options;
    options = {
      stats: {
        chunks: false,
        colors: true,
        version: false,
        hash: false
      }
    };
  }

  var webpackConfig = _.extend(
    {
      entry: dataPath,
      output: {
        path: '/build',
        filename: fileName
      }
    },
    config
  );

  var compiler = webpack(webpackConfig);
  compiler.outputFileSystem = memoryFs;

  compiler.run(function(err, stats){
    // handleFatalError
    var error = err;
    if (error) {
      return callBack(error);
    }

    var info = stats.toJson();
    // handleSoftErrors
    if (stats.hasErrors()) {
      error = info.errors;
    }
    // handleWarnings
    if (stats.hasWarnings()) {
      error = info.warnings;
    }

    console.log(stats.toString(options.stats));

    var serverContentBundled = memoryFs.readFileSync('/build/server.js', 'UTF8');
    callBack(error, serverContentBundled);
  });
}

module.exports = bundle;
