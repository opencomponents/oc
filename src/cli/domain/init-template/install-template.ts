import tryRequire from 'try-require';

import isTemplateValid from '../../../utils/is-template-valid';
import * as npm from '../../../utils/npm-utils';
import strings from '../../../resources';
import { Logger } from '../../logger';

interface Options {
  componentPath: string;
  templateType: string;
  compiler: string;
  logger: Logger;
}

export default function installTemplate(
  options: Options,
  callback: Callback<{ ok: true }, string>
) {
  const { compiler, componentPath, logger, templateType } = options;

  const npmOptions = {
    dependency: compiler,
    installPath: componentPath,
    isDev: true,
    save: true
  };

  logger.log(strings.messages.cli.installCompiler(compiler));

  npm.installDependency(npmOptions, (err, result) => {
    const errorMessage = 'template type not valid';
    if (err) {
      // @ts-ignore
      return callback(errorMessage);
    }

    const installedCompiler = tryRequire(result.dest);

    if (!isTemplateValid(installedCompiler, { compiler: true })) {
      // @ts-ignore
      return callback(errorMessage);
    }
    const version = installedCompiler.getInfo().version;
    logger.log(
      strings.messages.cli.installCompilerSuccess(
        templateType,
        compiler,
        version
      )
    );

    return callback(null, { ok: true });
  });
}
