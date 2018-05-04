const async = require('async');
const fs = require('fs-extra');
const path = require('path');

const getComponentsByDir = require('./get-components-by-dir')();

module.exports = {
  fetchList: (dirPath, callback) =>
    getComponentsByDir(dirPath, (err, list) => {
      if (err) return callback(err);
      if (list.length === 0) return callback(null, []);

      const toRemove = list.map(folder => path.join(folder, 'node_modules'));
      const folderExists = (folder, cb) =>
        fs.exists(folder, exists => cb(null, exists));

      async.filterSeries(toRemove, folderExists, callback);
    }),
  remove: (list, callback) => async.eachSeries(list, fs.remove, callback)
};
