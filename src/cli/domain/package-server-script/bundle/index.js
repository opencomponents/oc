var console = require('console');
var webpack = require("webpack");
var path = require('path');
var MemoryFS = require('memory-fs');

var memoryFs = new MemoryFS();

function bundle(dataPath, fileName, callBack) {
  // memoryFs.writeFileSync(path.join('/', fileName), serverContent);

  var webpackConfig = {
    entry: dataPath,
    output: {
      path: "/build",
      filename: fileName
    }
  };

  var compiler = webpack(webpackConfig);

  // compiler.inputFileSystem = memoryFs;
  // compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
  // compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
  compiler.outputFileSystem = memoryFs;

  compiler.run(function(err, stats){
    if (err) {
      console.error(err.stack || err);
      if (err.details) {
        console.error(err.details);
      }
      return;
    }

    var info = stats.toJson();

    if (stats.hasErrors()) {
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
    callBack(serverContentBundled);
  });
}

module.exports = bundle
