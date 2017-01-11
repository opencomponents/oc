/*jshint camelcase:false */
'use strict';
var webpack = require('webpack');
var wrapLoops = require('./wrapLoops');

var config = {
  module: {
    externals: /^[a-z@][a-z\-\/0-9]+$/,
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
          'falafel-loader',
          'babel-loader?' + JSON.stringify({
            cacheDirectory: true,
            'presets': [
              ['env', {
                'targets': {
                  'node': 0.10
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
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ],
  falafel: wrapLoops
};

module.exports = config;
