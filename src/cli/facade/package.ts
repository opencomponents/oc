import strings from '../../resources/index';
import path from 'path';
import { fromPromise } from 'universalify';
import handleDependencies from '../domain/handle-dependencies';
import { Logger } from '../logger';
import { Component, Local } from '../../types';

const cliPackage = ({ local, logger }: { local: Local; logger: Logger }) =>
  fromPromise(
    async (opts: {
      componentPath: string;
      useComponentDependencies?: boolean;
      compress?: boolean;
    }): Promise<Component> => {
      const componentPath = opts.componentPath;
      const useComponentDependencies = opts.useComponentDependencies;
      const packageDir = path.resolve(componentPath, '_package');
      const compressedPackagePath = path.resolve(
        componentPath,
        'package.tar.gz'
      );

      logger.warn(strings.messages.cli.PACKAGING(packageDir));
      try {
        await handleDependencies({
          components: [path.resolve(componentPath)],
          logger,
          useComponentDependencies
        });

        const packageOptions = {
          production: true,
          componentPath: path.resolve(componentPath)
        };

        const component = await local.package(packageOptions).catch(err => {
          logger.err(strings.errors.cli.PACKAGE_CREATION_FAIL(String(err)));
          return Promise.reject(err);
        });

        logger.ok(strings.messages.cli.PACKAGED(packageDir));

        if (opts.compress) {
          logger.warn(strings.messages.cli.COMPRESSING(compressedPackagePath));

          await local.compress(packageDir, compressedPackagePath).catch(err => {
            logger.err(strings.errors.cli.PACKAGE_CREATION_FAIL(String(err)));
            return Promise.reject(err);
          });

          logger.ok(strings.messages.cli.COMPRESSED(compressedPackagePath));

          return component;
        } else {
          return component;
        }
      } catch (err) {
        logger.err(String(err));
        throw err;
      }
    }
  );

export default cliPackage;
