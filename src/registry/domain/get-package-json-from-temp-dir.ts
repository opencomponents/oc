import fs from 'fs-extra';
import path from 'path';
import { Component } from '../../types';

export default function getPackageJsonFromTempDir(
  tempDirPath: string
): Promise<Component> {
  return fs.readJson(path.join(tempDirPath, 'package.json'));
}
