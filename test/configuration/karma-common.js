'use strict';

module.exports = {
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
    port: 9876,
    singleRun: false
  };