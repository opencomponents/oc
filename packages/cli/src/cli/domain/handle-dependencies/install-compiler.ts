import type { Template } from '@oc-framework/core';
import * as npm from '@oc-framework/core';
import { cleanRequire, isTemplateValid, strings } from '@oc-framework/core';
import type { Logger } from '../../logger';

export default async function installCompiler(options: {
  compilerPath: string;
  componentPath: string;
  dependency: string;
  logger: Logger;
}): Promise<Template> {
  const { compilerPath, componentPath, dependency, logger } = options;

  logger.warn(strings.messages.cli.INSTALLING_DEPS(dependency, componentPath));

  const npmOptions = {
    dependency,
    installPath: componentPath,
    save: false,
    silent: true,
    usePrefix: false
  };
  const errorMsg = 'There was a problem while installing the compiler';

  try {
    await npm.installDependency(npmOptions);
    logger.ok('OK');

    const compiler = cleanRequire<Template>(compilerPath, { justTry: true });

    if (!isTemplateValid(compiler)) {
      throw errorMsg;
    }

    return compiler;
  } catch {
    logger.err('FAIL');

    throw errorMsg;
  }
}
