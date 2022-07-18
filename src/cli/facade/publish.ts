import colors from 'colors/safe';
import path from 'path';
import fs from 'fs-extra';
import readCb from 'read';
import { promisify } from 'util';
import { Logger } from '../logger';
import { Component, RegistryCli, Local } from '../../types';
import { fromPromise } from 'universalify';

import handleDependencies from '../domain/handle-dependencies';
import strings from '../../resources/index';
import { toOcError } from '../../utils/errors';

const read = promisify(readCb);

const publish = ({
  logger,
  registry,
  local
}: {
  logger: Logger;
  registry: RegistryCli;
  local: Local;
}) =>
  fromPromise(
    async (opts: {
      componentPath: string;
      skipPackage?: boolean;
      username?: string;
      password?: string;
      registries?: string[];
    }): Promise<void> => {
      const componentPath = opts.componentPath;
      const skipPackage = opts.skipPackage;
      const packageDir = path.resolve(componentPath, '_package');
      const compressedPackagePath = path.resolve(
        componentPath,
        'package.tar.gz'
      );

      let errorMessage;

      const readPackageJson = () =>
        fs.readJson(path.join(packageDir, 'package.json'));

      const getCredentials = async (): Promise<{
        username: string;
        password: string;
      }> => {
        if (opts.username && opts.password) {
          logger.ok(strings.messages.cli.USING_CREDS);
          const { username, password } = opts;
          return { username, password };
        }

        logger.warn(strings.messages.cli.ENTER_USERNAME);

        const username = await read({});
        logger.warn(strings.messages.cli.ENTER_PASSWORD);
        const password = await read({ silent: true });

        return { username, password };
      };

      const compress = () => local.compress(packageDir, compressedPackagePath);

      const packageAndCompress = async (): Promise<Component> => {
        logger.warn(strings.messages.cli.PACKAGING(packageDir));
        const packageOptions = {
          production: true,
          componentPath: path.resolve(componentPath)
        };

        const component = await local.package(packageOptions);
        logger.warn(strings.messages.cli.COMPRESSING(compressedPackagePath));
        await compress();

        return component;
      };

      const putComponentToRegistry = async (options: {
        route: string;
        path: string;
        username?: string;
        password?: string;
      }): Promise<void> => {
        logger.warn(strings.messages.cli.PUBLISHING(options.route));

        try {
          await registry.putComponent(options);
          logger.ok(strings.messages.cli.PUBLISHED(options.route));
        } catch (err_: any) {
          const error = toOcError(err_);
          if (error.message === 'Unauthorized') {
            if (!!options.username || !!options.password) {
              logger.err(
                strings.errors.cli.PUBLISHING_FAIL(
                  strings.errors.cli.INVALID_CREDENTIALS
                )
              );
              throw error;
            }

            logger.warn(strings.messages.cli.REGISTRY_CREDENTIALS_REQUIRED);

            const credentials = await getCredentials();

            await putComponentToRegistry(Object.assign(options, credentials));
          } else if (error.code === 'cli_version_not_valid') {
            const upgradeCommand = strings.commands.cli.UPGRADE(
              err.details.suggestedVersion
            );
            const errorDetails =
              strings.errors.cli.OC_CLI_VERSION_NEEDS_UPGRADE(
                colors.blue(upgradeCommand)
              );

            errorMessage = strings.errors.cli.PUBLISHING_FAIL(errorDetails);
            logger.err(errorMessage);

            throw errorMessage;
          } else if (error.code === 'node_version_not_valid') {
            const details = strings.errors.cli.NODE_CLI_VERSION_NEEDS_UPGRADE(
              err.details.suggestedVersion
            );

            errorMessage = strings.errors.cli.PUBLISHING_FAIL(details);
            logger.err(errorMessage);

            throw errorMessage;
          } else {
            errorMessage = strings.errors.cli.PUBLISHING_FAIL(String(error));
            logger.err(errorMessage);

            throw new Error(errorMessage);
          }
        }
      };

      const publishToRegistries = async (
        registryLocations: string[],
        component: Component
      ) => {
        for (const registryUrl of registryLocations) {
          const registryNormalised = registryUrl.replace(/\/$/, '');
          const componentRoute = `${registryNormalised}/${component.name}/${component.version}`;

          await putComponentToRegistry({
            route: componentRoute,
            path: compressedPackagePath
          });
        }
        await local.cleanup(compressedPackagePath);
      };

      try {
        const registryLocations = opts.registries || (await registry.get());

        if (!skipPackage) {
          await handleDependencies({
            components: [path.resolve(componentPath)],
            logger
          }).catch(err => {
            logger.err(err);
            return Promise.reject(err);
          });

          const component = await packageAndCompress().catch(err => {
            errorMessage = strings.errors.cli.PACKAGE_CREATION_FAIL(
              String(err)
            );
            logger.err(errorMessage);
            return Promise.reject(errorMessage);
          });
          await publishToRegistries(registryLocations, component);
        } else {
          if (fs.existsSync(packageDir)) {
            const component = await readPackageJson().catch(err => {
              logger.err(String(err));
              return Promise.reject(err);
            });
            await compress().catch(err => {
              logger.err(String(err));
              return Promise.reject(err);
            });
            await publishToRegistries(registryLocations, component);
          } else {
            errorMessage = strings.errors.cli.PACKAGE_FOLDER_MISSING;
            logger.err(errorMessage);
            throw errorMessage;
          }
        }
      } catch (err) {
        logger.err(String(err));
        throw err;
      }
    }
  );

export default publish;
