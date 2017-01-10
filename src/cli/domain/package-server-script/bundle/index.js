var console = require('console');
var webpack = require("webpack");
var path = require('path');
var MemoryFS = require('memory-fs');

var memoryFs = new MemoryFS();

function bundle(dataPath, fileName, callBack) {

  var webpackConfig = {
    entry: dataPath,
    output: {
      path: "/build",
      filename: fileName
    }
  };

  var compiler = webpack(webpackConfig);
  compiler.outputFileSystem = memoryFs;

  compiler.run(function(err, stats){
    var error = err;
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.error(err.details);
      }
      return;
    }

    var info = stats.toJson();

    if (stats.hasErrors()) {
      error = info.errors;
      console.error(info.errors);
    }
    if (stats.hasWarnings()) {
      console.warn(info.warnings)
    }

    console.log(stats.toString({
      chunks: false,
      colors: true
    }));

    var serverContentBundled = memoryFs.readFileSync('/build/server.js', 'UTF8');
    callBack(error, serverContentBundled);
  });
}

module.exports = bundle
