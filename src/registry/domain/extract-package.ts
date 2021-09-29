import path from 'path';
import targz from 'targz';

import getPackageJsonFromTempDir from './get-package-json-from-temp-dir';

export default function extractPackage(
  files:
    | Express.Multer.File[]
    | {
        [fieldname: string]: Express.Multer.File[];
      },
  callback: Callback<{
    outputFolder: string;
    packageJson: any;
  }>
) {
  const packageFile = files[0],
    packagePath = path.resolve(packageFile.path),
    packageUntarOutput = path.resolve(
      packageFile.path,
      '..',
      packageFile.filename.replace('.tar.gz', '')
    ),
    packageOutput = path.resolve(packageUntarOutput, '_package');

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
