import async from 'async';
import fs from 'fs-extra';
import makeGetComponentsByDir from './get-components-by-dir';
import path from 'path';

const getComponentsByDir = makeGetComponentsByDir();

export function fetchList(dirPath: string, callback: Callback<string[]>) {
  return getComponentsByDir(dirPath, (err, list) => {
    if (err) return (callback as any)(err);
    if (list.length === 0) return callback(null, []);

    const toRemove = list.map(folder => path.join(folder, 'node_modules'));
    const folderExists = (folder, cb) =>
      fs.exists(folder, exists => cb(null, exists));

    async.filterSeries(toRemove, folderExists, callback as any);
  });
}

export function remove(list: string[], callback: Callback<string>) {
  return async.eachSeries(list, fs.remove, callback as any);
}
