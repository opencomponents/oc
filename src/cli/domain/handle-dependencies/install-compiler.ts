import cleanRequire from '../../../utils/clean-require';
import isTemplateValid from '../../../utils/is-template-valid';
import * as npm from '../../../utils/npm-utils';
import strings from '../../../resources/index';
import { Logger } from '../../logger';
import { Template } from '../../../types';

export default function installCompiler(
  options: {
    compilerPath: string;
    componentPath: string;
    dependency: string;
    logger: Logger;
  },
  cb: (err: string | number | null, data: Template) => void
): void {
  const { compilerPath, componentPath, dependency, logger } = options;

  logger.warn(strings.messages.cli.INSTALLING_DEPS(dependency, componentPath));

  const npmOptions = {
    dependency,
    installPath: componentPath,
    save: false,
    silent: true,
    usePrefix: false
  };

  npm.installDependency(npmOptions, err => {
    err ? logger.err('FAIL') : logger.ok('OK');
    const compiler = cleanRequire<Template>(compilerPath, { justTry: true });
    const isOk = isTemplateValid(compiler);
    const errorMsg = 'There was a problem while installing the compiler';
    cb(!err && isOk ? null : errorMsg, compiler as Template);
  });
}
