import path from 'node:path';
import { fromPromise } from 'universalify';
import strings from '../../resources/index';
import type { Component } from '../../types';
import handleDependencies from '../domain/handle-dependencies';
import type { Local } from '../domain/local';
import type { Logger } from '../logger';

const cliPackage = ({ local, logger }: { local: Local; logger: Logger }) =>
  fromPromise(
    async (opts: {
      componentPath: string;
      compress?: boolean;
    }): Promise<Component> => {
      const componentPath = opts.componentPath;
      const packageDir = path.resolve(componentPath, '_package');
      const compressedPackagePath = path.resolve(
        componentPath,
        'package.tar.gz'
      );

      logger.warn(strings.messages.cli.PACKAGING(packageDir));
      try {
        await handleDependencies({
          components: [path.resolve(componentPath)],
          logger
        });

        const packageOptions = {
          production: true,
          componentPath: path.resolve(componentPath)
        };

        const component = await local.package(packageOptions).catch((err) => {
          logger.err(strings.errors.cli.PACKAGE_CREATION_FAIL(String(err)));
          return Promise.reject(err);
        });

        logger.ok(strings.messages.cli.PACKAGED(packageDir));

        if (opts.compress) {
          logger.warn(strings.messages.cli.COMPRESSING(compressedPackagePath));

          await local
            .compress(packageDir, compressedPackagePath)
            .catch((err) => {
              logger.err(strings.errors.cli.PACKAGE_CREATION_FAIL(String(err)));
              return Promise.reject(err);
            });

          logger.ok(strings.messages.cli.COMPRESSED(compressedPackagePath));

          return component;
        }
        return component;
      } catch (err) {
        logger.err(String(err));
        throw err;
      }
    }
  );

export default cliPackage;
