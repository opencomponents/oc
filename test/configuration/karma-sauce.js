'use strict';

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', 'sinon'],
    files: [
      'jquery-1.11.2.js',
      'jQuery.XDomainRequest.js',
      '../../components/oc-client/src/head.load.js',
      '../../node_modules/handlebars/dist/handlebars.runtime.js',
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
      build: 'local',
      startConnect: true
    },
    captureTimeout: 120000,
    singleRun: false
  });

  if (process.env.TRAVIS)
  {
    config.captureTimeout = 0;
    config.logLevel = config.LOG_DEBUG;
    config.transports = ['websocket'];
    config.sauceLabs.build = 'TRAVIS #' + process.env.TRAVIS_BUILD_NUMBER + ' (' + process.env.TRAVIS_BUILD_ID + ')';
    config.sauceLabs.startConnect = false;
    config.sauceLabs.recordScreenshots = true;
    //config.sauceLabs.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
  }
};
