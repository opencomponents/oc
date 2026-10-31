import * as npm from '@oc-framework/core';
import { isTemplateValid, strings } from '@oc-framework/core';
import tryRequire from 'try-require';
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
  } catch {
    throw errorMessage;
  }
}
