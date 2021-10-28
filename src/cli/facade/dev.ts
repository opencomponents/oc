import colors from 'colors/safe';
import getPortCb from 'getport';
import livereload from 'livereload';
import path from 'path';
import _ from 'lodash';
import { promisify } from 'util';
import { fromPromise } from 'universalify';

import getMockedPlugins from '../domain/get-mocked-plugins';
import handleDependencies from '../domain/handle-dependencies';
import * as oc from '../../index';
import strings from '../../resources/index';
import watch from '../domain/watch';
import { Logger } from '../logger';
import { Local } from '../../types';

type Registry = ReturnType<typeof oc.Registry>;

const cliMessages = strings.messages.cli;
const cliErrors = strings.errors.cli;

const delay = (time = 0) => new Promise(res => setTimeout(res, time));
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

      const watchForChanges = function (
        {
          components,
          refreshLiveReload
        }: { components: string[]; refreshLiveReload: () => void },
        cb: any
      ) {
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
          logger.warn(cliMessages.PACKAGING_COMPONENTS, true);

          for (const dir of componentsDirs) {
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
        mockedPlugins.forEach(p => registry.register(p));

        registry.on('request', data => {
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
      const components = await local.getComponentsByDir(componentsDir);

      if (_.isEmpty(components)) {
        const err = cliErrors.DEV_FAIL(cliErrors.COMPONENTS_NOT_FOUND);
        logger.err(err);
        throw err;
      }

      logger.ok('OK');
      components.forEach(component =>
        logger.log(colors.green('├── ') + component)
      );

      const dependencies = await handleDependencies({
        components,
        logger
      }).catch(err => {
        logger.err(err);
        return Promise.reject(err);
      });

      await packageComponents(components);

      let liveReload: { refresher: () => void; port: number | undefined } = {
        refresher: _.noop,
        port: undefined
      };
      if (hotReloading) {
        const otherPort = await getPort(port + 1).catch(err => {
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
        discovery: true,
        env: { name: 'local' },
        fallbackRegistryUrl,
        hotReloading,
        liveReloadPort: liveReload.port,
        local: true,
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
        await promisify(registry.start);

        if (optWatch) {
          watchForChanges(
            { components, refreshLiveReload: liveReload.refresher },
            packageComponents
          );
        }

        return registry;
      } catch (err: any) {
        if (err.code === 'EADDRINUSE') {
          // eslint-disable-next-line no-ex-assign
          err = cliErrors.PORT_IS_BUSY(port) as any;
        }

        logger.err(String(err));
        throw err;
      }
    }
  );

export default dev;
