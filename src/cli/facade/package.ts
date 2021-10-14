import strings from '../../resources/index';
import path from 'path';
import handleDependencies from '../domain/handle-dependencies';
import { Logger } from '../logger';
import { Component, Local } from '../../types';
import { fromPromise } from 'universalify';

const cliPackage =
  ({ local, logger }: { local: Local; logger: Logger }) =>
  (
    opts: {
      componentPath: string;
      useComponentDependencies?: boolean;
      compress?: boolean;
    },
    callback: Callback<Component, string>
  ): void => {
    const componentPath = opts.componentPath,
      useComponentDependencies = opts.useComponentDependencies,
      packageDir = path.resolve(componentPath, '_package'),
      compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

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
        fromPromise(local.package)(packageOptions, (err, component) => {
          if (err) {
            logger.err(strings.errors.cli.PACKAGE_CREATION_FAIL(String(err)));
            return callback(err as any, undefined as any);
          }

          logger.ok(strings.messages.cli.PACKAGED(packageDir));

          if (opts.compress) {
            logger.warn(
              strings.messages.cli.COMPRESSING(compressedPackagePath)
            );

            fromPromise(local.compress)(
              packageDir,
              compressedPackagePath,
              err => {
                if (err) {
                  logger.err(
                    strings.errors.cli.PACKAGE_CREATION_FAIL(String(err))
                  );
                  return callback(err as any, undefined as any);
                }
                logger.ok(
                  strings.messages.cli.COMPRESSED(compressedPackagePath)
                );
                callback(null, component);
              }
            );
          } else {
            callback(null, component);
          }
        });
      }
    );
  };

export default cliPackage;

module.exports = cliPackage;
