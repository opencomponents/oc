import fs from 'fs-extra';
import path from 'node:path';

import installTemplate from './install-template';
import * as npm from '../../../utils/npm-utils';
import scaffold from './scaffold';
import type { Logger } from '../../logger';

export default async function initTemplate(options: {
  componentPath: string;
  templateType: string;
  componentName: string;
  compiler: string;
  logger: Logger;
}): Promise<{ ok: true }> {
  const { compiler, componentPath } = options;
  const compilerPath = path.join(componentPath, 'node_modules', compiler);
  const npmOptions = { initPath: componentPath, silent: true };

  await fs.ensureDir(componentPath);
  await npm.init(npmOptions);
  await installTemplate(options);
  await scaffold(Object.assign(options, { compilerPath }));

  return { ok: true };
}
