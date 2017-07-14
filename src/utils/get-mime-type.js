'use strict';

module.exports = function(extension) {
  return {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.map': 'application/json',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.html': 'text/html'
  }[extension];
};
