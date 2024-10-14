import fs from 'node:fs/promises';
import path from 'node:path';

import * as npm from '../../../utils/npm-utils';
import type { Logger } from '../../logger';
import installTemplate from './install-template';
import scaffold from './scaffold';

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

  await fs.mkdir(componentPath, { recursive: true });
  await npm.init(npmOptions);
  await installTemplate(options);
  await scaffold(Object.assign(options, { compilerPath }));
  await npm.installDependencies({
    installPath: componentPath,
    silent: true,
    usePrefix: true
  });

  return { ok: true };
}
