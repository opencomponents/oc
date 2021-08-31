'use strict';

const path = require('path');
const chokidar = require('chokidar');

const settings = require('../../resources/settings');

module.exports = function(dirs, baseDir, changed) {
  const watcher = chokidar.watch(path.resolve(baseDir), {
    ignored: settings.filesToIgnoreOnDevWatch,
    persistent: true,
    ignoreInitial: true,
    usePolling: false
  });
  const onChange = fileName => {
    const componentDir = dirs.find(dir =>
      Boolean(fileName.match(escapeRegularExpression(dir + path.sep)))
    );
    changed(null, fileName, componentDir);
  };

  watcher
    .on('add', onChange)
    .on('change', onChange)
    .on('unlink', onChange)
    .on('error', changed);
};

function escapeRegularExpression(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
