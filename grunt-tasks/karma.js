'use strict';

var _ = require('underscore');

var customLaunchers = {
  'chrome': {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Linux',
    version: '41'
  },
  'ff': {
    base: 'SauceLabs',
    browserName: 'firefox',
    platform: 'Linux',
    version: '36'
  },
  'android': {
    base: 'SauceLabs',
    browserName: 'android',
    platform: 'Linux',
    version: '4.4',
    deviceName: 'Android Emulator',
    'device-orientation': 'portrait'
  },
  'ie11': {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 8.1',
    version: '11'
  },
  'ie10': {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 8',
    version: '10'
  },
  'ie9': {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 7',
    version: '9'
  },
  'ie8': {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows XP',
    version: '8'
  },
  'safari': {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'OS X 10.10',
    version: '8'
  },
  'ipad': {
    base: 'SauceLabs',
    browserName: 'ipad',
    platform: 'OS X 10.10',
    version: '8',
    'device-orientation': 'portrait'
  },
  'iphone': {
    base: 'SauceLabs',
    browserName: 'iphone',
    deviceName: 'iPhone Simulator',
    platform: 'OS X 10.10',
    version: '8',
    'device-orientation': 'portrait'
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
    customLaunchers: _.pick(customLaunchers, 'chrome', 'ff', 'android'),
    browsers: ['chrome', 'ff', 'android']
  },
  'sauce-windows': {
    customLaunchers: _.pick(customLaunchers, 'ie11', 'ie10', 'ie9', 'ie8'),
    browsers: ['ie11', 'ie10', 'ie9', 'ie8']
  },
  'sauce-ie8': {
    customLaunchers: _.pick(customLaunchers, 'ie8'),
    browsers: ['ie8']
  },  
  'sauce-ie9': {
    customLaunchers: _.pick(customLaunchers, 'ie9'),
    browsers: ['ie9']
  },  
  'sauce-osx': {
    customLaunchers: _.pick(customLaunchers, 'safari', 'iphone', 'ipad'),
    browsers: ['safari', 'iphone', 'ipad']
  },
  local: {
    configFile: 'test/configuration/karma-local.js',
    singleRun: true
  }
};