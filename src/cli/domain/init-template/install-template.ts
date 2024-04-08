import tryRequire from 'try-require';

import isTemplateValid from '../../../utils/is-template-valid';
import * as npm from '../../../utils/npm-utils';
import strings from '../../../resources';
import type { Logger } from '../../logger';

interface Options {
  componentPath: string;
  templateType: string;
  compiler: string;
  logger: Logger;
}

export default async function installTemplate(
  options: Options
): Promise<{ ok: true }> {
  const { compiler, componentPath, logger, templateType } = options;
  const errorMessage = 'template type not valid';

  const npmOptions = {
    dependency: compiler,
    installPath: componentPath,
    isDev: true,
    save: true,
    usePrefix: false
  };

  logger.log(strings.messages.cli.installCompiler(compiler));

  try {
    const result = await npm.installDependency(npmOptions);

    const installedCompiler = tryRequire(result.dest);

    if (!isTemplateValid(installedCompiler, { compiler: true })) {
      throw errorMessage;
    }
    const version = installedCompiler.getInfo().version;
    logger.log(
      strings.messages.cli.installCompilerSuccess(
        templateType,
        compiler,
        version
      )
    );

    return { ok: true };
  } catch (err) {
    throw errorMessage;
  }
}
