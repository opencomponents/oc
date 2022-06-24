import cleanRequire from '../../../utils/clean-require';
import isTemplateValid from '../../../utils/is-template-valid';
import * as npm from '../../../utils/npm-utils';
import strings from '../../../resources/index';
import { Logger } from '../../logger';
import { Template } from '../../../types';

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
      throw new Error(errorMsg);
    }

    return compiler;
  } catch (err) {
    logger.err('FAIL');

    throw new Error(errorMsg);
  }
}
