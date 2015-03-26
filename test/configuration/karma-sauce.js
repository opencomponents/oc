'use strict';

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', 'sinon'],
    files: [
      'jquery-1.11.2.js',
      'jQuery.XDomainRequest.js',
      '../../components/oc-client/src/head.load.js',
      '../../node_modules/handlebars/dist/handlebars.runtime.min.js',
      '../../node_modules/jade/runtime.js',
      '../../components/oc-client/src/oc-client.js',

      '../front-end/*.js'
    ],
    reporters: ['dots', 'saucelabs'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,

    sauceLabs: {
      testName: 'oc front-end tests',
      build: process.env.TRAVIS_BUILD_NUMBER || 'local'
    },
    captureTimeout: 120000,
    singleRun: false
  });
};
