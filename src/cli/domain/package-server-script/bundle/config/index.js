/*jshint camelcase:false */
'use strict';

var webpack = require('webpack');
var path = require('path');
var externalDependenciesHandlers = require('./externalDependenciesHandlers');

module.exports = function webpackConfigGenerator(params){
  return {
    entry: params.dataPath,
    target: 'node',
    output: {
      path: '/build',
      filename: params.fileName,
      libraryTarget: 'commonjs2',
    },
    externals: externalDependenciesHandlers(params.dependencies),
    module: {
      loaders: [
        {
          test: /\.json$/,
          exclude: /node_modules/,
          loader: 'json-loader'
        },
        {
          test: /\.js?$/,
          exclude: /node_modules/,
          loaders: [
            'infinite-loop-loader',
            'babel-loader?' + JSON.stringify({
              cacheDirectory: true,
              'presets': [
                [require.resolve('babel-preset-env'), {
                  'targets': {
                    'node': 4
                  }
                }]
              ]
            })
          ],
        }
      ]
    },
    plugins: [
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compressor: {
          warnings: false,
          screw_ie8: true
        },
        sourceMap: false
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      })
    ],
    resolveLoader: {
      root: path.resolve(__dirname, '../../../../../../node_modules')
    }
  };
};
