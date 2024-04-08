import fs from 'fs-extra';
import makeGetComponentsByDir from './get-components-by-dir';
import path from 'node:path';

const getComponentsByDir = makeGetComponentsByDir();

export async function fetchList(dirPath: string): Promise<string[]> {
  const list = await getComponentsByDir(dirPath);

  if (list.length === 0) return [];

  const toRemove = list.map(folder => path.join(folder, 'node_modules'));

  return toRemove.filter(fs.existsSync);
}

export async function remove(list: string[]): Promise<void> {
  for (const item of list) {
    await fs.remove(item);
  }
}
