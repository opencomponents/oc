'use strict';

var path = require('path');

var getMimeType = require('./get-mime-type');

module.exports = function(filePath){
  var ext = path.extname(filePath).toLowerCase(),
      isGizipped = false;

  if(ext === '.gz'){
    isGizipped = true;
    ext = path.extname(filePath.slice(0, -3)).toLowerCase();
  }

  return {
    gzip: isGizipped,
    extname: ext,
    mimeType: getMimeType(ext)
  };
};