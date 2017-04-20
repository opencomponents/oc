'use strict';
var _ = require('lodash');
var commonConfig = require('./karma-common');

module.exports = function(config) {
  config.set(_.extend({}, commonConfig, {
    reporters: ['dots', 'saucelabs'],
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    singleRun: true,

    sauceLabs: {
      testName: 'oc front-end tests',
      build: 'local',
      startConnect: true
    },
    captureTimeout: 180000,
    browserNoActivityTimeout: 180000,
    browserDisconnectTolerance: 5
  }));

  if (process.env.TRAVIS)
  {
    //config.logLevel = config.LOG_DEBUG;
    config.sauceLabs.build = 'TRAVIS #' + process.env.TRAVIS_BUILD_NUMBER + ' (' + process.env.TRAVIS_BUILD_ID + ')';
    config.sauceLabs.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
  }
};
