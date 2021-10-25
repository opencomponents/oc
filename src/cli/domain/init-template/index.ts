import async from 'async';
import fs from 'fs-extra';
import path from 'path';

import installTemplate from './install-template';
import * as npm from '../../../utils/npm-utils';
import scaffold from './scaffold';
import { Logger } from '../../logger';

export default function initTemplate(
  options: {
    componentPath: string;
    templateType: string;
    componentName: string;
    compiler: string;
    logger: Logger;
  },
  callback: (err: string | null, data: { ok: true }) => void
): void {
  const { compiler, componentPath } = options;
  const compilerPath = path.join(componentPath, 'node_modules', compiler);
  const npmOptions = { initPath: componentPath, silent: true };

  async.series(
    [
      cb => fs.ensureDir(componentPath, cb),
      cb => npm.init(npmOptions, cb as any),
      cb => installTemplate(options, cb as any),
      cb => scaffold(Object.assign(options, { compilerPath }), cb as any)
    ],
    callback as any
  );
}
