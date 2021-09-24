import fs from 'fs-extra';
import path from 'path';

export default function getPackageJsonFromTempDir(
  tempDirPath: string,
  callback: Callback<any>
): void {
  return fs.readJson(path.join(tempDirPath, 'package.json'), callback);
}
