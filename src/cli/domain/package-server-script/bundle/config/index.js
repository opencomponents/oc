/*jshint camelcase:false */
'use strict';

const webpack = require('webpack');
const path = require('path');
const externalDependenciesHandlers = require('./external-dependencies-handlers');
const BabiliPlugin = require('babili-webpack-plugin');

module.exports = function webpackConfigGenerator(params) {
  return {
    entry: params.dataPath,
    target: 'node',
    output: {
      path: '/build',
      filename: params.fileName,
      libraryTarget: 'commonjs2'
    },
    externals: externalDependenciesHandlers(params.dependencies),
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve('infinite-loop-loader')
            },
            {
              loader: require.resolve('babel-loader'),
              options: {
                cacheDirectory: true,
                presets: [
                  [
                    require.resolve('babel-preset-env'),
                    {
                      modules: false,
                      targets: {
                        node: 4
                      }
                    }
                  ]
                ]
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new BabiliPlugin(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      })
    ]
  };
};
