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
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader:  'infinite-loop-loader'
            },
            {
              loader:  'babel-loader',
              options: {
                cacheDirectory: true,
                'presets': [
                  [require.resolve('babel-preset-env'), {
                    'modules': false,
                    'targets': {
                      'node': 4
                    }
                  }]
                ]
              }
            }
          ],
        }
      ]
    },
    resolveLoader: {
      modules: ['node_modules', path.resolve(__dirname, '../../../../../../node_modules')]
    }
  };
};
