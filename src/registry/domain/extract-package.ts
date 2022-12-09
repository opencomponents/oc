import path from 'path';
import targz from 'targz';
import { promisify } from 'util';

import getPackageJsonFromTempDir from './get-package-json-from-temp-dir';
import { Component } from '../../types';

export default async function extractPackage(
  files:
    | Express.Multer.File[]
    | {
        [fieldname: string]: Express.Multer.File[];
      },
  tarExtractMode: number
): Promise<{
  outputFolder: string;
  packageJson: Component;
}> {
  const packageFile = (files as Express.Multer.File[])[0];
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
    dest: packageUntarOutput,
    tar: {
      dmode: tarExtractMode,
      fmode: tarExtractMode
    }
  });

  const packageJson = await getPackageJsonFromTempDir(packageOutput);

  return {
    outputFolder: packageOutput,
    packageJson
  };
}
