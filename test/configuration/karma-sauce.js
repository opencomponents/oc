'use strict';

var _ = require('underscore');

  var customLaunchers = {
    'SL_Chrome_Linux': {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Linux',
      version: '41'
    },
    'SL_Firefox_Linux': {
      base: 'SauceLabs',
      browserName: 'firefox',
      platform: 'Linux',
      version: '36'
    },
    'SL_IE11_Windows_8.1': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11'
    },
    'SL_IE10_Windows_8': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 8',
      version: '10'
    },
    'SL_IE9_Windows_7': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '9'
    },
    'SL_IE8_Windows_7': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows XP',
      version: '8'
    },
    'SL_Safari_Yosemite': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.10',
      version: '8'
    },
    'SL_Ipad': {
      base: 'SauceLabs',
      browserName: 'ipad',
      platform: 'OS X 10.8',
      version: '6.1',
      'device-orientation': 'portrait'
    },
    'SL_Iphone': {
      base: 'SauceLabs',
      browserName: 'iphone',
      platform: 'OS X 10.8',
      version: '6.1',
      'device-orientation': 'portrait'
    }
  };

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', 'sinon'],
    files: [
      'jquery-1.11.2.js',
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
    customLaunchers: customLaunchers,
    browsers: _.keys(customLaunchers),
    singleRun: false
  });
};
