import path from 'path';

import getMissingDependencies from './get-missing-dependencies';
import * as npm from '../../../utils/npm-utils';
import strings from '../../../resources/index';
import { Logger } from '../../logger';

export default function installMissingDependencies(
  options: { dependencies: Dictionary<string>; logger: Logger },
  callback: (err: string | null) => void
): void {
  const { dependencies, logger } = options;

  const missing = getMissingDependencies(dependencies);

  if (!missing.length) {
    return callback(null);
  }

  logger.warn(strings.messages.cli.INSTALLING_DEPS(missing.join(', ')), true);

  const npmOptions = {
    dependencies: missing,
    installPath: path.resolve('.'),
    save: false,
    silent: true,
    usePrefix: true
  };

  npm.installDependencies(npmOptions, err => {
    if (err || getMissingDependencies(dependencies).length) {
      logger.err('FAIL');
      return callback(strings.errors.cli.DEPENDENCIES_INSTALL_FAIL);
    }

    logger.ok('OK');
    callback(null);
  });
}
