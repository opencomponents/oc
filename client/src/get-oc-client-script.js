'use strict';

const fs = require('fs');
const path = require('path');

const TryGetCached = require('./try-get-cached');

module.exports = function(cache){

  const tryGetCached = new TryGetCached(cache);

  return function(callback){
    tryGetCached('scripts', 'oc-client', (cb) => {
      fs.readFile(path.resolve(__dirname, './oc-client.min.js'), 'utf-8', cb);
    }, callback);
  };
};