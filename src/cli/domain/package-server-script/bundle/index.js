/*jshint camelcase:false */
'use strict';

var console = require('console');
var webpack = require('webpack');
var path = require('path');
var MemoryFS = require('memory-fs');

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


  var webpackConfig = {
    entry: dataPath,
    output: {
      path: '/build',
      filename: fileName
    },
    plugins: [
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compressor: {
          warnings: false,
          screw_ie8: true
        }
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      })
    ],
    module: {
      loaders: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          loader: 'babel',
          query: {
            'presets': [
              ['env', {
                'targets': {
                  'node': 'current'
                }
              }]
            ]
          }
        }
      ]
    }
  };

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
