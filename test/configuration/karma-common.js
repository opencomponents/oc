'use strict';

module.exports = {
  basePath: '',
  frameworks: ['jasmine', 'sinon'],
  files: [

    // Dynamically loaded via oc-client, alredy loaded to speed-up tests
    'jquery-1.11.2.js',
    'jQuery.XDomainRequest.js',
    '../../node_modules/handlebars/dist/handlebars.runtime.js',
    '../../node_modules/jade/runtime.js',

    // The tests settings
    'test-settings.js',

    // The oc-client bundle
    '../../components/oc-client/src/head.load.js',
    '../../components/oc-client/src/oc-client.js',

    // The tests
    '../front-end/*.js'
  ],
  port: 9876,
  singleRun: false
};