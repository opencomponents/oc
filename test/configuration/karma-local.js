'use strict';
var _ = require('lodash');
var commonConfig = require('./karma-common');

module.exports = function(config) {
  config.set(_.extend({}, commonConfig, {
    reporters: ['dots'],
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS']
  }));
};
