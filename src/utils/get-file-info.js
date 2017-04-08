'use strict';

var path = require('path');

var getMimeType = require('./get-mime-type');

module.exports = function(filePath){
  var ext = path.extname(filePath).toLowerCase(),
    isGzipped = false;

  if(ext === '.gz'){
    isGzipped = true;
    ext = path.extname(filePath.slice(0, -3)).toLowerCase();
  }

  return {
    gzip: isGzipped,
    extname: ext,
    mimeType: getMimeType(ext)
  };
};