'use strict';

module.exports = function(extension){
  return {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.png': 'image/png'
  }[extension];
};