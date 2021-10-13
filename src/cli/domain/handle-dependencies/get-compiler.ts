import path from 'path';
import { Template } from '../../../types';

import cleanRequire from '../../../utils/clean-require';
import { Logger } from '../../logger';
import installCompiler from './install-compiler';

export default function getCompiler(options: {
  compilerDep: string;
  componentPath: string;
  logger: Logger;
  pkg: { name: string; devDependencies: Dictionary<string> };
}): Promise<Template> {
  const { compilerDep, componentPath, logger, pkg } = options;
  const compilerPath = path.join(componentPath, 'node_modules', compilerDep);
  const compiler = cleanRequire(compilerPath, { justTry: true });

  if (compiler) {
    return Promise.resolve(compiler);
  }

  let dependency = compilerDep;
  if (pkg.devDependencies[compilerDep]) {
    dependency += `@${pkg.devDependencies[compilerDep]}`;
  }

  const installOptions = {
    compilerPath,
    componentName: pkg.name,
    componentPath,
    dependency,
    logger
  };

  return installCompiler(installOptions);
}
