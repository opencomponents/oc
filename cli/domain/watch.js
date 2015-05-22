'use strict';

var path = require('path');
var watch = require('watch');

module.exports = function(dirs, baseDir, changed){
  try {
    watch.watchTree(path.resolve(baseDir), {
      ignoreUnreadableDir: true,
      ignoreDotFiles: false
    }, function(fileName, currentStat, previousStat){
      if(!!currentStat || !!previousStat){
        if(/node_modules|package.tar.gz|_package/gi.test(fileName) === false){
          changed(null, fileName);
        }
      }
    });
  } catch(err){
    changed(err);
  }
};