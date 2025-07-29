import fs from 'node:fs/promises';
import path from 'node:path';
import type { Component } from '../../types';

const readJson = (path: string) => fs.readFile(path, 'utf8').then(JSON.parse);

export default function getPackageJsonFromTempDir(
  tempDirPath: string
): Promise<Component> {
  return readJson(path.join(tempDirPath, 'package.json'));
}
