import path from 'node:path';
import colors from 'colors/safe';
import fs from 'fs-extra';
import { fromPromise } from 'universalify';
import strings from '../../resources/index';
import type { Component } from '../../types';
import handleDependencies from '../domain/handle-dependencies';
import type { Local } from '../domain/local';
import type { RegistryCli } from '../domain/registry';
import type { Logger } from '../logger';

const validate = ({
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
      registries?: string[];
    }): Promise<void> => {
      const componentPath = opts.componentPath;
      const skipPackage = opts.skipPackage;
      const packageDir = path.resolve(componentPath, '_package');

      let errorMessage: string;

      const readPackageJson = () =>
        fs.readJson(path.join(packageDir, 'package.json'));

      const packageComponent = async (): Promise<Component> => {
        logger.warn(strings.messages.cli.PACKAGING(packageDir));
        const packageOptions = {
          production: true,
          componentPath: path.resolve(componentPath)
        };

        const component = await local.package(packageOptions);
        return component;
      };

      const validateComponentWithRegistry = async (options: {
        registryUrl: string;
        packageJson: any;
        componentName: string;
        componentVersion: string;
      }): Promise<void> => {
        const { registryUrl, packageJson, componentName, componentVersion } =
          options;
        const registryNormalised = registryUrl.replace(/\/$/, '');
        const validateUrl = `${registryNormalised}/~registry/validate/${componentName}/${componentVersion}`;

        logger.warn(
          `Validating component against registry: ${registryNormalised}`
        );

        try {
          await registry.validateComponent({
            url: validateUrl,
            packageJson
          });
          logger.ok(
            `✓ Validation successful for registry: ${registryNormalised}`
          );
        } catch (err: any) {
          if (err.code === 'cli_version_not_valid') {
            const upgradeCommand = strings.commands.cli.UPGRADE(
              err.details.suggestedVersion
            );
            const errorDetails =
              strings.errors.cli.OC_CLI_VERSION_NEEDS_UPGRADE(
                colors.blue(upgradeCommand)
              );

            errorMessage = strings.errors.cli.VALIDATION_FAIL(errorDetails);
            logger.err(errorMessage);
            throw errorMessage;
          } else if (err.code === 'node_version_not_valid') {
            const details = strings.errors.cli.NODE_CLI_VERSION_NEEDS_UPGRADE(
              err.details.suggestedVersion
            );

            errorMessage = strings.errors.cli.VALIDATION_FAIL(details);
            logger.err(errorMessage);
            throw errorMessage;
          } else {
            if (err.message) {
              errorMessage = err.message;
            } else if (err && typeof err === 'object') {
              try {
                errorMessage = JSON.stringify(err);
              } catch {
                errorMessage = String(err);
              }
            } else {
              errorMessage = String(err);
            }
            errorMessage = `✗ Validation failed for registry ${registryNormalised}: ${errorMessage}`;
            logger.err(errorMessage);
            throw errorMessage;
          }
        }
      };

      const validateWithRegistries = async (
        registryLocations: string[],
        component: Component
      ) => {
        const packageJsonPath = path.join(packageDir, 'package.json');
        const packageJson = await fs.readJson(packageJsonPath);

        for (const registryUrl of registryLocations) {
          await validateComponentWithRegistry({
            registryUrl,
            packageJson,
            componentName: component.name,
            componentVersion: component.version
          });
        }
      };

      try {
        const registryLocations = opts.registries || (await registry.get());

        if (!skipPackage) {
          await handleDependencies({
            components: [path.resolve(componentPath)],
            logger
          }).catch((err) => {
            logger.err(err);
            return Promise.reject(err);
          });

          const component = await packageComponent().catch((err) => {
            errorMessage = strings.errors.cli.PACKAGE_CREATION_FAIL(
              String(err)
            );
            logger.err(errorMessage);
            return Promise.reject(errorMessage);
          });
          await validateWithRegistries(registryLocations, component);
        } else {
          if (fs.existsSync(packageDir)) {
            const component = await readPackageJson().catch((err) => {
              logger.err(String(err));
              return Promise.reject(err);
            });
            await validateWithRegistries(registryLocations, component);
          } else {
            errorMessage = strings.errors.cli.PACKAGE_FOLDER_MISSING;
            logger.err(errorMessage);
            throw errorMessage;
          }
        }

        logger.ok(
          '✓ Component validation completed successfully for all registries'
        );
      } catch (err) {
        // Don't log again if it's already been logged by validateComponentWithRegistry
        if (!String(err).includes('✗ Validation failed for registry')) {
          logger.err(String(err));
        }
        throw err;
      }
    }
  );

export default validate;
