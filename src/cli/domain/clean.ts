import async from 'async';
import fs from 'fs-extra';
import makeGetComponentsByDir from './get-components-by-dir';
import path from 'path';

const getComponentsByDir = makeGetComponentsByDir();

export function fetchList(
  dirPath: string,
  callback: (err: Error | null, data: string[]) => void
): void {
  return getComponentsByDir(dirPath, (err, list) => {
    if (err) return (callback as any)(err);
    if (list.length === 0) return callback(null, []);

    const toRemove = list.map(folder => path.join(folder, 'node_modules'));
    const folderExists = (
      folder: string,
      cb: (err: Error | null, data: boolean) => void
    ) => fs.exists(folder, exists => cb(null, exists));

    async.filterSeries(toRemove, folderExists, callback as any);
  });
}

export function remove(
  list: string[],
  callback: (err: Error | null, data: string) => void
): void {
  return async.eachSeries(list, fs.remove, callback as any);
}
