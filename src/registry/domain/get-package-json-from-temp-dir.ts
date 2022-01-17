import fs from 'fs-extra';
import path from 'path';
import { PackageJson } from 'type-fest';

export default function getPackageJsonFromTempDir(
  tempDirPath: string
): Promise<PackageJson> {
  return fs.readJson(path.join(tempDirPath, 'package.json'));
}
