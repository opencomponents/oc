import path from 'path';
import targz from 'targz';
import { promisify } from 'util';
import { PackageJson } from 'type-fest';

import getPackageJsonFromTempDir from './get-package-json-from-temp-dir';

export default async function extractPackage(
  files:
    | Express.Multer.File[]
    | {
        [fieldname: string]: Express.Multer.File[];
      }
): Promise<{
  outputFolder: string;
  packageJson: PackageJson;
}> {
  const packageFile: Express.Multer.File = (files as any)[0];
  const packagePath = path.resolve(packageFile.path);
  const packageUntarOutput = path.resolve(
    packageFile.path,
    '..',
    packageFile.filename.replace('.tar.gz', '')
  );
  const packageOutput = path.resolve(packageUntarOutput, '_package');

  const decompress = promisify(targz.decompress);

  await decompress({
    src: packagePath,
    dest: packageUntarOutput
  });

  const packageJson = await getPackageJsonFromTempDir(packageOutput);

  return {
    outputFolder: packageOutput,
    packageJson: packageJson
  };
}
