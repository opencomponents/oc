import async from 'async';
import colors from 'colors/safe';
import path from 'path';
import fs from 'fs-extra';
import read from 'read';
import _ from 'lodash';
import { Logger } from '../logger';
import { Component, RegistryCli, Local } from '../../types';

import handleDependencies from '../domain/handle-dependencies';
import strings from '../../resources/index';

const publish =
  ({
    logger,
    registry,
    local
  }: {
    logger: Logger;
    registry: RegistryCli;
    local: Local;
  }) =>
  (
    opts: {
      componentPath: string;
      skipPackage?: boolean;
      username?: string;
      password?: string;
    },
    callback: (err?: Error | string) => void
  ): void => {
    const componentPath = opts.componentPath;
    const skipPackage = opts.skipPackage;
    const packageDir = path.resolve(componentPath, '_package');
    const compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    let errorMessage;

    const readPackageJson = (cb: Callback<Component>) =>
      fs.readJson(path.join(packageDir, 'package.json'), cb);

    const getCredentials = (
      cb: Callback<{ username: string; password: string }>
    ) => {
      if (opts.username && opts.password) {
        logger.ok(strings.messages.cli.USING_CREDS);
        return cb(null, _.pick(opts, 'username', 'password') as any);
      }

      logger.warn(strings.messages.cli.ENTER_USERNAME);

      read({}, (err, username) => {
        logger.warn(strings.messages.cli.ENTER_PASSWORD);

        read({ silent: true }, (err, password) => {
          cb(null, { username, password });
        });
      });
    };

    const compress = (cb: (error: string | Error | null) => void) => {
      local.compress(packageDir, compressedPackagePath, cb);
    };

    const packageAndCompress = (cb: Callback<Component, Error | string>) => {
      logger.warn(strings.messages.cli.PACKAGING(packageDir));
      const packageOptions = {
        production: true,
        componentPath: path.resolve(componentPath)
      };

      local.package(packageOptions, (err, component) => {
        if (err) {
          return cb(err, undefined as any);
        }

        logger.warn(strings.messages.cli.COMPRESSING(compressedPackagePath));

        compress(err => {
          if (err) {
            return cb(err, undefined as any);
          }
          cb(null, component);
        });
      });
    };

    const putComponentToRegistry = (
      options: {
        route: string;
        path: string;
        username?: string;
        password?: string;
      },
      cb: Callback<'ok', string>
    ) => {
      logger.warn(strings.messages.cli.PUBLISHING(options.route));

      registry.putComponent(options, err => {
        if (err) {
          if (err === 'Unauthorized') {
            if (!!options.username || !!options.password) {
              logger.err(
                strings.errors.cli.PUBLISHING_FAIL(
                  strings.errors.cli.INVALID_CREDENTIALS
                )
              );
              return cb(err, undefined as any);
            }

            logger.warn(strings.messages.cli.REGISTRY_CREDENTIALS_REQUIRED);

            return getCredentials((err, credentials) => {
              putComponentToRegistry(_.extend(options, credentials), cb);
            });
          } else if ((err as any).code === 'cli_version_not_valid') {
            const upgradeCommand = strings.commands.cli.UPGRADE(
              (err as any).details.suggestedVersion
            );
            const errorDetails =
              strings.errors.cli.OC_CLI_VERSION_NEEDS_UPGRADE(
                colors.blue(upgradeCommand)
              );

            errorMessage = strings.errors.cli.PUBLISHING_FAIL(errorDetails);
            logger.err(errorMessage);
            return cb(errorMessage, undefined as any);
          } else if ((err as any).code === 'node_version_not_valid') {
            const details = strings.errors.cli.NODE_CLI_VERSION_NEEDS_UPGRADE(
              (err as any).details.suggestedVersion
            );

            errorMessage = strings.errors.cli.PUBLISHING_FAIL(details);
            logger.err(errorMessage);
            return cb(errorMessage, undefined as any);
          } else {
            if (_.isObject(err)) {
              try {
                err = JSON.stringify(err);
              } catch (er) {}
            }
            errorMessage = strings.errors.cli.PUBLISHING_FAIL(err);
            logger.err(errorMessage);
            return cb(errorMessage, undefined as any);
          }
        } else {
          logger.ok(strings.messages.cli.PUBLISHED(options.route));
          return cb(null, 'ok');
        }
      });
    };

    const publishToRegistries = (
      registryLocations: string[],
      component: Component
    ) => {
      async.eachSeries(
        registryLocations,
        (registryUrl, next) => {
          const registryNormalised = registryUrl.replace(/\/$/, '');
          const componentRoute = `${registryNormalised}/${component.name}/${component.version}`;
          putComponentToRegistry(
            { route: componentRoute, path: compressedPackagePath },
            next as any
          );
        },
        err => {
          local.cleanup(compressedPackagePath, err2 => {
            if (err) {
              return callback(err);
            }
            callback(err2);
          });
        }
      );
    };

    registry.get((err: string | null, registryLocations: string[]) => {
      if (err) {
        logger.err(err);
        return callback(err);
      }

      if (!skipPackage) {
        handleDependencies(
          { components: [path.resolve(componentPath)], logger },
          err => {
            if (err) {
              logger.err(err);
              return callback(err);
            }
            packageAndCompress((err, component) => {
              if (err) {
                errorMessage = strings.errors.cli.PACKAGE_CREATION_FAIL(
                  String(err)
                );
                logger.err(errorMessage);
                return callback(errorMessage);
              }

              publishToRegistries(registryLocations, component);
            });
          }
        );
      } else {
        if (fs.existsSync(packageDir)) {
          readPackageJson((err, component) => {
            if (err) {
              logger.err(String(err));
              return callback(err);
            }
            compress(err => {
              if (err) {
                logger.err(String(err));
                return callback(err);
              }

              publishToRegistries(registryLocations, component);
            });
          });
        } else {
          errorMessage = strings.errors.cli.PACKAGE_FOLDER_MISSING;
          logger.err(errorMessage);
          return callback(errorMessage);
        }
      }
    });
  };

export default publish;

module.exports = publish;
