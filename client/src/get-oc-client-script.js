'use strict';

const getOcClientBrowser = require('oc-client-browser');
const TryGetCached = require('./try-get-cached');

module.exports = function(cache) {
  const tryGetCached = new TryGetCached(cache);

  return function(callback) {
    tryGetCached(
      'scripts',
      'oc-client',
      cb => getOcClientBrowser.getLib(cb),
      callback
    );
  };
};
