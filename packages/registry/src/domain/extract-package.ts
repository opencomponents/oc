import path from 'node:path';
import { promisify } from 'node:util';
import type { Component, UploadedFile } from '@oc-framework/core';
import targz from 'targz';
import getPackageJsonFromTempDir from './get-package-json-from-temp-dir';

export default async function extractPackage(
  files:
    | UploadedFile[]
    | {
        [fieldname: string]: UploadedFile[];
      },
  tarExtractMode: number
): Promise<{
  outputFolder: string;
  packageJson: Component;
  packagePath: string;
  packageUntarOutput: string;
}> {
  const packageFile = (files as UploadedFile[])[0];
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
    packageJson,
    packagePath,
    packageUntarOutput
  };
}
