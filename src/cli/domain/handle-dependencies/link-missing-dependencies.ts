import path from 'path';
import fs from 'fs-extra';
import getMissingDependencies from './get-missing-dependencies';
import strings from '../../../resources/index';
import stripVersion from '../../../utils/strip-version';
import { Logger } from '../../logger';

export default function linkMissingDependencies(
  options: {
    componentPath: string;
    dependencies: Dictionary<string>;
    logger: Logger;
  },
  callback: (err: string | null) => void
): void {
  const { componentPath, dependencies, logger } = options;

  const missingDependencies = getMissingDependencies(dependencies);

  if (!missingDependencies.length) {
    return callback(null);
  }

  logger.warn(
    strings.messages.cli.LINKING_DEPENDENCIES(missingDependencies.join(', ')),
    true
  );

  const symLinkType = 'dir';
  let symLinkError = false;

  for (const dependency of missingDependencies) {
    const moduleName = stripVersion(dependency);
    const pathToComponentModule = path.resolve(
      componentPath,
      'node_modules',
      moduleName
    );
    const pathToModule = path.resolve('.', 'node_modules', moduleName);
    try {
      fs.ensureSymlinkSync(pathToComponentModule, pathToModule, symLinkType);
    } catch (err) {
      symLinkError = true;
      logger.err(
        strings.errors.cli.DEPENDENCY_LINK_FAIL(moduleName, String(err))
      );
    }
  }

  return !symLinkError
    ? callback(null)
    : callback(strings.errors.cli.DEPENDENCIES_LINK_FAIL);
}
