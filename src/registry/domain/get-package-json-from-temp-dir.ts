import path from 'node:path';
import fs from 'fs-extra';
import type { Component } from '../../types';

export default function getPackageJsonFromTempDir(
  tempDirPath: string
): Promise<Component> {
  return fs.readJson(path.join(tempDirPath, 'package.json'));
}
