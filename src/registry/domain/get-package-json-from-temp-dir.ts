import fs from 'fs-extra';
import path from 'path';
import { PackageJson } from 'type-fest';

export default function getPackageJsonFromTempDir(
  tempDirPath: string,
  callback: (err: Error | null, data: PackageJson) => void
): void {
  return fs.readJson(path.join(tempDirPath, 'package.json'), callback);
}
