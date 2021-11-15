import strings from '../../resources/index';
import path from 'path';
import handleDependencies from '../domain/handle-dependencies';
import { Logger } from '../logger';
import { Component, Local } from '../../types';

const cliPackage =
  ({ local, logger }: { local: Local; logger: Logger }) =>
  (
    opts: {
      componentPath: string;
      useComponentDependencies?: boolean;
      compress?: boolean;
    },
    callback: (err: string | null, data: Component) => void
  ): void => {
    const componentPath = opts.componentPath;
    const useComponentDependencies = opts.useComponentDependencies;
    const packageDir = path.resolve(componentPath, '_package');
    const compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    logger.warn(strings.messages.cli.PACKAGING(packageDir));
    handleDependencies(
      {
        components: [path.resolve(componentPath)],
        logger,
        useComponentDependencies
      },
      err => {
        if (err) {
          logger.err(err);
          return callback(err, undefined as any);
        }
        const packageOptions = {
          production: true,
          componentPath: path.resolve(componentPath)
        };
        local.package(packageOptions, (err, component) => {
          if (err) {
            logger.err(strings.errors.cli.PACKAGE_CREATION_FAIL(String(err)));
            return callback(err as any, undefined as any);
          }

          logger.ok(strings.messages.cli.PACKAGED(packageDir));

          if (opts.compress) {
            logger.warn(
              strings.messages.cli.COMPRESSING(compressedPackagePath)
            );

            local.compress(packageDir, compressedPackagePath, err => {
              if (err) {
                logger.err(
                  strings.errors.cli.PACKAGE_CREATION_FAIL(String(err))
                );
                return callback(err as any, undefined as any);
              }
              logger.ok(strings.messages.cli.COMPRESSED(compressedPackagePath));
              callback(null, component);
            });
          } else {
            callback(null, component);
          }
        });
      }
    );
  };

export default cliPackage;
