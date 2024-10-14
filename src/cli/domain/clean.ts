import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import makeGetComponentsByDir from './get-components-by-dir';

const getComponentsByDir = makeGetComponentsByDir();

export async function fetchList(dirPath: string): Promise<string[]> {
  const list = await getComponentsByDir(dirPath);

  if (list.length === 0) return [];

  const toRemove = list.map((folder) => path.join(folder, 'node_modules'));

  return toRemove.filter(existsSync);
}

export async function remove(list: string[]): Promise<void> {
  for (const item of list) {
    await fs.rmdir(item, { recursive: true });
  }
}
