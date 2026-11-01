import path from 'node:path';
import type { Component, UploadedFile } from '@oc-framework/core';
import { decompress } from '@oc-framework/core';
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

  await decompress(packagePath, packageUntarOutput, tarExtractMode);

  const packageJson = await getPackageJsonFromTempDir(packageOutput);

  return {
    outputFolder: packageOutput,
    packageJson,
    packagePath,
    packageUntarOutput
  };
}
