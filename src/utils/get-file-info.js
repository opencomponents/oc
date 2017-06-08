'use strict';

const path = require('path');

const getMimeType = require('./get-mime-type');

module.exports = function(filePath) {
  let ext = path.extname(filePath).toLowerCase(),
    isGzipped = false;

  if (ext === '.gz') {
    isGzipped = true;
    ext = path.extname(filePath.slice(0, -3)).toLowerCase();
  }

  return {
    gzip: isGzipped,
    extname: ext,
    mimeType: getMimeType(ext)
  };
};
