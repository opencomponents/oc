'use strict';

const path = require('path');
const watch = require('watch');

module.exports = function(dirs, baseDir, changed) {
  try {
    watch.watchTree(
      path.resolve(baseDir),
      {
        interval: 0.5,
        ignoreUnreadableDir: true,
        ignoreDotFiles: false,
        filter: fileOrDir =>
          /node_modules|package\.tar\.gz|_package|\.sw[op]|\.git|\.DS_Store|oc\.json/.test(
            fileOrDir
          ) === false
      },
      (fileName, currentStat, previousStat) => {
        if (!!currentStat || !!previousStat) {
          const componentDir = dirs.find(dir =>
            Boolean(fileName.match(dir + path.sep))
          );
          changed(null, fileName, componentDir);
        }
      }
    );
  } catch (err) {
    changed(err);
  }
};
