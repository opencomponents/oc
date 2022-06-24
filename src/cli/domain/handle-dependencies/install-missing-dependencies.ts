import path from 'path';

import getMissingDependencies from './get-missing-dependencies';
import * as npm from '../../../utils/npm-utils';
import strings from '../../../resources/index';
import { Logger } from '../../logger';

export default async function installMissingDependencies(options: {
  dependencies: Record<string, string>;
  logger: Logger;
}): Promise<void> {
  const { dependencies, logger } = options;

  const missing = getMissingDependencies(dependencies);

  if (!missing.length) {
    return;
  }

  const installPath = path.resolve('.');

  logger.warn(
    strings.messages.cli.INSTALLING_DEPS(missing.join(', '), installPath)
  );

  const npmOptions = {
    dependencies: missing,
    installPath,
    save: false,
    silent: false,
    usePrefix: true
  };

  try {
    await npm.installDependencies(npmOptions);

    if (getMissingDependencies(dependencies).length) {
      logger.err('FAIL');
      throw new Error(strings.errors.cli.DEPENDENCIES_INSTALL_FAIL);
    }

    logger.ok('OK');
  } catch (err) {
    logger.err('FAIL');
    if (err) logger.err(String(err));
    throw new Error(strings.errors.cli.DEPENDENCIES_INSTALL_FAIL);
  }
}
