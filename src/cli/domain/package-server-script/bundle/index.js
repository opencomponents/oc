/*jshint camelcase:false */
'use strict';
const webpackConfig = require('./config');
const MemoryFS = require('memory-fs');
const path = require('path');
const webpack = require('webpack');

const memoryFs = new MemoryFS();

module.exports = function bundle(params, callBack) {
  const config = webpackConfig(params);
  const compiler = webpack(config);
  compiler.outputFileSystem = memoryFs;

  compiler.run((error, stats) => {
    let softError;
    let warning;

    // handleFatalError
    if (error) {
      return callBack(error);
    }

    const info = stats.toJson();
    // handleSoftErrors
    if (stats.hasErrors()) {
      softError = info.errors.toString();
      return callBack(softError);
    }
    // handleWarnings
    if (stats.hasWarnings()) {
      warning = info.warnings.toString();
    }

    const log = stats.toString(params.webpack.stats);

    if(log){
      console.log(log);
    }

    const basePath = path.join(params.dataPath, '../build');

    callBack(warning, {
      'server.js': memoryFs.readFileSync(`${basePath}/server.js`, 'UTF8'),
      'server.js.map': memoryFs.readFileSync(`${basePath}/server.js.map`, 'UTF8')
    });
  });
};
