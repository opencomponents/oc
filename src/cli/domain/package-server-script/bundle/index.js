/*jshint camelcase:false */
'use strict';
var webpackConfig = require('./config');
var console = require('console');
var MemoryFS = require('memory-fs');
var webpack = require('webpack');

var memoryFs = new MemoryFS();

module.exports = function bundle(params, callBack) {
  var config = webpackConfig(params);
  var compiler = webpack(config);
  compiler.outputFileSystem = memoryFs;

  compiler.run(function(error, stats){
    var sofError;
    var warning;

    // handleFatalError
    if (error) {
      return callBack(error);
    }

    var info = stats.toJson();
    // handleSoftErrors
    if (stats.hasErrors()) {
      sofError = info.errors.toString();
      return callBack(sofError);
    }
    // handleWarnings
    if (stats.hasWarnings()) {
      warning = info.warnings.toString();
    }

    console.log(stats.toString(params.webpack.stats));

    var serverContentBundled = memoryFs.readFileSync('/build/server.js', 'UTF8');
    callBack(warning, serverContentBundled);
  });
};
