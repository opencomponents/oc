'use strict';

module.exports = function(extension){
  return {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.map': 'application/json',
    '.png': 'image/png'
  }[extension];
};