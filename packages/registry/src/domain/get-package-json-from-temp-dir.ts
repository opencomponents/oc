import path from 'node:path';
import type { Component } from '@oc-framework/core';
import fs from 'fs-extra';

export default function getPackageJsonFromTempDir(
  tempDirPath: string
): Promise<Component> {
  return fs.readJson(path.join(tempDirPath, 'package.json'));
}
