import path from 'node:path';
import { promisify } from 'node:util';
import colors from 'colors/safe';
import getPortCb from 'getport';
import livereload from 'livereload';
import { fromPromise } from 'universalify';

import * as oc from '../../index';
import strings from '../../resources/index';
import getMockedPlugins from '../domain/get-mocked-plugins';
import handleDependencies from '../domain/handle-dependencies';
import type { Local } from '../domain/local';
import watch from '../domain/watch';
import type { Logger } from '../logger';

type Registry = ReturnType<typeof oc.Registry>;

const cliMessages = strings.messages.cli;
const cliErrors = strings.errors.cli;

const delay = (time = 0) => new Promise((res) => setTimeout(res, time));
const getPort = promisify(getPortCb);

const dev = ({ local, logger }: { logger: Logger; local: Local }) =>
  fromPromise(
    async (opts: {
      prefix: string;
      dirPath: string;
      port?: number;
      baseUrl: string;
      fallbackRegistryUrl: string;
      hotReloading?: boolean;
      postRequestPayloadSize?: string;
      components?: string[];
      watch?: boolean;
      verbose?: boolean;
      production?: boolean;
    }): Promise<Registry> => {
      const componentsDir = opts.dirPath;
      const port = opts.port || 3000;
      const baseUrl = opts.baseUrl || `http://localhost:${port}/`;
      const fallbackRegistryUrl = opts.fallbackRegistryUrl;
      const hotReloading =
        typeof opts.hotReloading === 'undefined' ? true : opts.hotReloading;
      const optWatch = typeof opts.watch === 'undefined' ? true : opts.watch;
      let packaging = false;
      const postRequestPayloadSize = opts.postRequestPayloadSize || '100kb';

      const watchForChanges = (
        {
          components,
          refreshLiveReload
        }: { components: string[]; refreshLiveReload: () => void },
        cb: any
      ) => {
        watch(components, componentsDir, (err, changedFile, componentDir) => {
          if (err) {
            logger.err(strings.errors.generic(String(err)));
          } else {
            logger.warn(cliMessages.CHANGES_DETECTED(changedFile));
            if (!hotReloading) {
              logger.warn(cliMessages.HOT_RELOADING_DISABLED);
            } else if (!componentDir) {
              cb(components, refreshLiveReload);
            } else {
              cb([componentDir], refreshLiveReload);
            }
          }
        });
      };

      const packageComponents = async (
        componentsDirs: string[]
      ): Promise<void> => {
        if (!packaging) {
          packaging = true;
          logger.warn(cliMessages.PACKAGING_COMPONENTS, false);

          for (const dir of componentsDirs) {
            logger.warn(cliMessages.PACKAGING(dir), false);
            const packageOptions = {
              componentPath: dir,
              minify: false,
              verbose: opts.verbose,
              production: opts.production
            };

            try {
              await local.package(packageOptions);
              packaging = false;
              logger.ok('OK');
            } catch (error: any) {
              const errorDescription =
                error instanceof SyntaxError || !!error.message
                  ? error.message
                  : error;
              logger.err(
                cliErrors.PACKAGING_FAIL(dir, String(errorDescription))
              );
              logger.warn(cliMessages.RETRYING_10_SECONDS);
              await delay(10000);
              packaging = false;
              packageComponents(componentsDirs);
            }
          }
        }
      };

      const registerPlugins = (registry: Registry) => {
        const mockedPlugins = getMockedPlugins(logger, componentsDir);
        for (const plugin of mockedPlugins) {
          registry.register(plugin);
        }

        registry.on('request', (data) => {
          if (data.errorCode === 'PLUGIN_MISSING_FROM_REGISTRY') {
            logger.err(
              cliErrors.PLUGIN_MISSING_FROM_REGISTRY(
                String(data.errorDetails),
                colors.blue(strings.commands.cli.MOCK_PLUGIN)
              )
            );
          }
        });
      };

      logger.warn(cliMessages.SCANNING_COMPONENTS, true);
      const components = await local.getComponentsByDir(
        componentsDir,
        opts.components
      );

      if (!components.length) {
        const err = cliErrors.DEV_FAIL(cliErrors.COMPONENTS_NOT_FOUND);
        logger.err(err);
        throw err;
      }

      logger.ok('OK');
      for (const component of components) {
        logger.log(colors.green('├── ') + component);
      }
      const dependencies = await handleDependencies({
        install: true,
        components,
        logger
      }).catch((err) => {
        logger.err(err);
        return Promise.reject(err);
      });

      await packageComponents(components);

      let liveReload: { refresher: () => void; port: number | undefined } = {
        refresher: () => {},
        port: undefined
      };
      if (hotReloading) {
        const otherPort = await getPort(port + 1).catch((err) => {
          logger.err(String(err));
          return Promise.reject(err);
        });

        const liveReloadServer = livereload.createServer({
          port: otherPort
        });
        const refresher = () => liveReloadServer.refresh('/');
        liveReload = { refresher, port: otherPort };
      }

      const registry = oc.Registry({
        baseUrl,
        prefix: opts.prefix || '',
        dependencies: dependencies.modules,
        compileClient: true,
        discovery: true,
        env: { name: 'local' },
        fallbackRegistryUrl,
        hotReloading,
        liveReloadPort: liveReload.port,
        local: true,
        postRequestPayloadSize,
        components: opts.components,
        path: path.resolve(componentsDir),
        port,
        templates: dependencies.templates,
        verbosity: 1
      });

      registerPlugins(registry);

      logger.warn(cliMessages.REGISTRY_STARTING(baseUrl));
      if (liveReload.port) {
        logger.warn(
          cliMessages.REGISTRY_LIVERELOAD_STARTING(String(liveReload.port))
        );
      }
      try {
        await promisify(registry.start)();

        if (optWatch) {
          watchForChanges(
            { components, refreshLiveReload: liveReload.refresher },
            packageComponents
          );
        }

        return registry;
      } catch (err: any) {
        const error =
          err.code === 'EADDRINUSE' ? cliErrors.PORT_IS_BUSY(port) : err;

        logger.err(String(error));
        throw error;
      }
    }
  );

export default dev;
