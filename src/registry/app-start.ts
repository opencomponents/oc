import colors from 'colors/safe';
import path from 'path';
import fs from 'fs-extra';
import type { Repository } from './domain/repository';
import { Config } from '../types';

const packageInfo = fs.readJsonSync(
  path.join(
    __dirname,
    '..',
    'components',
    'oc-client',
    '_package',
    'package.json'
  )
);

export default async function appStart(
  repository: Repository,
  options: Config
): Promise<void> {
  if (options.local) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const logger = options.verbosity ? console : { log: () => {} };

  logger.log(
    colors.yellow(
      `Connecting to library: ${options.storage.options['bucket']}/${options.storage.options.componentsDir}`
    )
  );

  try {
    const componentInfo = await repository.getComponentVersions('oc-client');

    logger.log(
      colors.yellow(
        `Ensuring oc-client@${packageInfo.version} is available on library...`
      )
    );

    if (!componentInfo.includes(packageInfo.version)) {
      logger.log(colors.yellow('Component not found. Publishing it...'));

      const pkgInfo = {
        outputFolder: path.resolve(
          __dirname,
          '../components/oc-client/_package'
        ),
        packageJson: packageInfo
      };

      try {
        await repository.publishComponent({
          pkgDetails: pkgInfo,
          componentName: 'oc-client',
          componentVersion: packageInfo.version
        });
        logger.log(colors.green('Component published.'));
      } catch (err) {
        logger.log(
          colors.red(`Component not published: ${(err as Error).message}`)
        );
        throw err;
      }
    } else {
      logger.log(colors.green('Component is available on library.'));
    }
  } catch (err) {
    logger.log(colors.red(String(err)));
    throw err;
  }
}
