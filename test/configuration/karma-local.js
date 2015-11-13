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
      '../front-end/ocTestConfig.js',
      '../../components/oc-client/src/oc-client.js',

      '../front-end/*.js'
    ],
    reporters: ['dots'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false
  });
};
