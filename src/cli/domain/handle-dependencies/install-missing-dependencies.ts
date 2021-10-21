import path from 'path';

import getMissingDependencies from './get-missing-dependencies';
import * as npm from '../../../utils/npm-utils';
import strings from '../../../resources/index';
import { Logger } from '../../logger';

export default async function installMissingDependencies(options: {
  dependencies: Dictionary<string>;
  logger: Logger;
}): Promise<void> {
  const { dependencies, logger } = options;

  const missing = getMissingDependencies(dependencies);

  if (!missing.length) {
    return;
  }

  logger.warn(strings.messages.cli.INSTALLING_DEPS(missing.join(', ')), true);

  const npmOptions = {
    dependencies: missing,
    installPath: path.resolve('.'),
    save: false,
    silent: true,
    usePrefix: true
  };

  try {
    await npm.installDependencies(npmOptions);

    if (getMissingDependencies(dependencies).length) {
      logger.err('FAIL');
      throw strings.errors.cli.DEPENDENCIES_INSTALL_FAIL;
    }

    logger.ok('OK');
  } catch (err) {
    logger.err('FAIL');
    throw strings.errors.cli.DEPENDENCIES_INSTALL_FAIL;
  }
}
