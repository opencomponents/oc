'use strict';

module.exports = function(extension){
  
  var mimes = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.png': 'image/png'
  };

  return !mimes[extension] ? undefined : mimes[extension];
};