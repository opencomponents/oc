'use strict';

const _ = require('lodash');

const customLaunchers = {
  'chrome': {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Linux',
    version: '48'
  },
  'ff': {
    base: 'SauceLabs',
    browserName: 'firefox',
    platform: 'Linux',
    version: '45'
  },
  'android': {
    base: 'SauceLabs',
    browserName: 'android',
    platform: 'Linux',
    version: '5.1',
    deviceName: 'Android Emulator',
    'device-orientation': 'portrait'
  },
  'edge14': {
    base: 'SauceLabs',
    browserName: 'MicrosoftEdge',
    platform: 'Windows 10',
    version: '14'
  },
  'ie11': {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 10',
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
  'safari': {
    base: 'SauceLabs',
    browserName: 'Safari',
    platform: 'OS X 10.10',
    version: '8'
  },
  'ipad': {
    base: 'SauceLabs',
    browserName: 'Safari',
    deviceName: 'iPad Simulator',
    platform: 'iOS',
    version: '9.3',
    'device-orientation': 'portrait'
  },
  'iphone': {
    base: 'SauceLabs',
    browserName: 'Safari',
    deviceName: 'iPhone Simulator',
    platform: 'iOS',
    version: '9.3',
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
    customLaunchers: _.pick(customLaunchers, 'edge14', 'ie11', 'ie10', 'ie9'),
    browsers: ['edge14', 'ie11', 'ie10', 'ie9']
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
