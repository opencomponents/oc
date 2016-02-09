'use strict';

var fs = require('fs');
var path = require('path');

var TryGetCached = require('./try-get-cached');

module.exports = function(cache){

  var tryGetCached = new TryGetCached(cache);
  
  return function(callback){
    tryGetCached('scripts', 'oc-client', function(cb){
      fs.readFile(path.resolve(__dirname, './oc-client.min.js'), 'utf-8', cb);
    }, callback);
  };
};