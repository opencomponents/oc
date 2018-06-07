'use strict';

const path = require('path');
const watch = require('watch');

const settings = require('../../resources/settings');

module.exports = function(dirs, baseDir, changed) {
  try {
    watch.watchTree(
      path.resolve(baseDir),
      {
        interval: 0.5,
        ignoreUnreadableDir: true,
        ignoreDotFiles: false,
        filter: fileOrDir =>
          settings.filesToIgnoreOnDevWatch.test(fileOrDir) === false
      },
      (fileName, currentStat, previousStat) => {
        if (!!currentStat || !!previousStat) {
          const componentDir = dirs.find(dir =>
            Boolean(fileName.match(escapeRegularExpression(dir + path.sep)))
          );
          changed(null, fileName, componentDir);
        }
      }
    );
  } catch (err) {
    changed(err);
  }
};

function escapeRegularExpression(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
