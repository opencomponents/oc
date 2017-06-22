'use strict';

module.exports = {
  basePath: '',
  frameworks: ['jasmine', 'sinon'],
  files: [

    // Dynamically loaded via oc-client, alredy loaded to speed-up tests
    'jquery-1.11.2.js',
    'jQuery.XDomainRequest.js',
    'jade.runtime.js',
    'handlebars.runtime.js',

    // The tests settings
    'test-settings.js',

    // The oc-client bundle
    '../../src/components/oc-client/src/l.js',
    '../../src/components/oc-client/src/oc-client.js',

    // The tests
    '../front-end/*.js'
  ],
  port: 9876,
  singleRun: false
};
