'use strict';

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', 'sinon'],
    files: [
      '../components/oc-client/src/head.load.js',
      '../node_modules/handlebars/dist/handlebars.runtime.min.js',
      '../node_modules/jade/runtime.js',
      '../components/oc-client/src/oc-client.js',

      'front-end/*.js'
    ],
    reporters: ['dots'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['PhantomJS'],
    singleRun: false
  });
};
