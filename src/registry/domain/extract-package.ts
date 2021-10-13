import path from 'path';
import targz from 'targz';
import { PackageJson } from 'type-fest';

import getPackageJsonFromTempDir from './get-package-json-from-temp-dir';

export default function extractPackage(
  files:
    | Express.Multer.File[]
    | {
        [fieldname: string]: Express.Multer.File[];
      },
  callback: Callback<{
    outputFolder: string;
    packageJson: PackageJson;
  }>
): void {
  const packageFile: Express.Multer.File = (files as any)[0];
  const packagePath = path.resolve(packageFile.path);
  const packageUntarOutput = path.resolve(
    packageFile.path,
    '..',
    packageFile.filename.replace('.tar.gz', '')
  );
  const packageOutput = path.resolve(packageUntarOutput, '_package');

  targz.decompress(
    {
      src: packagePath,
      dest: packageUntarOutput
    },
    err => {
      if (err) {
        return (callback as any)(err);
      }

      getPackageJsonFromTempDir(packageOutput, (err, packageJson) => {
        callback(err, {
          outputFolder: packageOutput,
          packageJson: packageJson
        });
      });
    }
  );
}
