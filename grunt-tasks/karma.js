'use strict';

var _ = require('underscore');

var customLaunchers = {
  linux: {
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
    'SL_Android_Linux': {
      base: 'SauceLabs',
      browserName: 'android',
      platform: 'Linux',
      version: '4.4',
      deviceName: 'Android Emulator',
      'device-orientation': 'portrait'
    }
  },
  windows: {
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
    }
  },
  osx: {
    'SL_Safari_Yosemite': {
      base: 'SauceLabs',
      browserName: 'safari',
      platform: 'OS X 10.10',
      version: '8'
    },
    'SL_Ipad': {
      base: 'SauceLabs',
      browserName: 'ipad',
      platform: 'OS X 10.10',
      version: '8',
      'device-orientation': 'portrait'
    },
    'SL_Iphone': {
      base: 'SauceLabs',
      browserName: 'iphone',
      deviceName: 'iPhone Simulator',
      platform: 'OS X 10.10',
      version: '8',
      'device-orientation': 'portrait'
    }
  } 
};

module.exports = {
  options: {
    configFile: 'test/configuration/karma-sauce.js',
    singleRun: true
  },
  dev: {
    configFile: 'test/configuration/karma-local.js',
    singleRun: false,
    autoWatch: true
  },
  'sauce-linux': {
    customLaunchers: customLaunchers.linux,
    browsers: _.keys(customLaunchers.linux)
  },
  'sauce-windows': {
    customLaunchers: customLaunchers.windows,
    browsers: _.keys(customLaunchers.windows)
  },
  'sauce-osx': {
    customLaunchers: customLaunchers.osx,
    browsers: _.keys(customLaunchers.osx)
  },
  local: {
    configFile: 'test/configuration/karma-local.js',
    singleRun: true
  }
};