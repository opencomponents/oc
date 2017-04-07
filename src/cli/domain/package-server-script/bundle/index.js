/*jshint camelcase:false */
'use strict';
var webpackConfig = require('./config');
var MemoryFS = require('memory-fs');
var webpack = require('webpack');

var memoryFs = new MemoryFS();

module.exports = function bundle(params, callBack) {
  var config = webpackConfig(params);
  var compiler = webpack(config);
  compiler.outputFileSystem = memoryFs;

  compiler.run(function(error, stats){
    var softError;
    var warning;

    // handleFatalError
    if (error) {
      return callBack(error);
    }

    var info = stats.toJson();
    // handleSoftErrors
    if (stats.hasErrors()) {
      softError = info.errors.toString();
      return callBack(softError);
    }
    // handleWarnings
    if (stats.hasWarnings()) {
      warning = info.warnings.toString();
    }

    var log = stats.toString(params.webpack.stats);

    if(!!log){
      console.log(log);
    }

    callBack(warning, {
      'server.js': memoryFs.readFileSync('/build/server.js', 'UTF8'),
      'server.js.map': memoryFs.readFileSync('/build/server.js.map', 'UTF8')
    });
  });
};
