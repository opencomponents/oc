/*jshint camelcase:false */
'use strict';
var _ = require('underscore');
var webpackConfig = require('./config');
var console = require('console');
var MemoryFS = require('memory-fs');
var path = require('path');
var webpack = require('webpack');

var memoryFs = new MemoryFS();

module.exports = function bundle(params, callBack) {
  var config = webpackConfig(params)
  var compiler = webpack(config);
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
      error = info.errors.toString();
    }
    // handleWarnings
    if (stats.hasWarnings()) {
      error = info.warnings.toString();
    }

    console.log(stats.toString('normal'));

    var serverContentBundled = memoryFs.readFileSync('/build/server.js', 'UTF8');
    callBack(error, serverContentBundled);
  });
}
