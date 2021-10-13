import fs from 'fs-extra';
import path from 'path';

export default function getPackageJsonFromTempDir(
  tempDirPath: string
): Promise<any> {
  return fs.readJson(path.join(tempDirPath, 'package.json'));
}
