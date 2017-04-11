'use strict';

const path = require('path');
const watch = require('watch');

module.exports = function(dirs, baseDir, changed){
  try {
    watch.watchTree(path.resolve(baseDir), {
      ignoreUnreadableDir: true,
      ignoreDotFiles: false
    }, (fileName, currentStat, previousStat) => {
      if(!!currentStat || !!previousStat){
        if(/node_modules|package.tar.gz|_package|\.sw[op]/gi.test(fileName) === false){
          changed(null, fileName);
        }
      }
    });
  } catch(err){
    changed(err);
  }
};
