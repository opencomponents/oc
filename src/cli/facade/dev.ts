import async from 'async';
import colors from 'colors/safe';
import getPort from 'getport';
import livereload from 'livereload';
import path from 'path';
import _ from 'lodash';

import getMockedPlugins from '../domain/get-mocked-plugins';
import handleDependencies from '../domain/handle-dependencies';
import oc from '../../index';
import strings from '../../resources/index';
import watch from '../domain/watch';
import { Logger } from '../logger';
import { Local } from '../../types';
import { fromPromise } from 'universalify';

type Registry = ReturnType<typeof oc.Registry>;

const cliMessages = strings.messages.cli;
const cliErrors = strings.errors.cli;

const dev =
  ({ local, logger }: { logger: Logger; local: Local }) =>
  (
    opts: {
      prefix: string;
      dirPath: string;
      port?: number;
      baseUrl: string;
      fallbackRegistryUrl: string;
      hotReloading?: boolean;
      watch?: boolean;
      verbose?: boolean;
      production?: boolean;
    },
    callback: Callback<Registry, Error | string>
  ): void => {
    const componentsDir = opts.dirPath;
    const port = opts.port || 3000;
    const baseUrl = opts.baseUrl || `http://localhost:${port}/`;
    const fallbackRegistryUrl = opts.fallbackRegistryUrl;
    const hotReloading = _.isUndefined(opts.hotReloading)
      ? true
      : opts.hotReloading;
    const optWatch = _.isUndefined(opts.watch) ? true : opts.watch;
    let packaging = false;

    const watchForChanges = function (
      {
        components,
        refreshLiveReload
      }: { components: string[]; refreshLiveReload: boolean },
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

    const packageComponents = (
      componentsDirs: string[],
      optCb?: () => void
    ) => {
      const cb = _.isFunction(optCb) ? optCb : _.noop;

      let i = 0;

      if (!packaging) {
        packaging = true;
        logger.warn(cliMessages.PACKAGING_COMPONENTS, true);

        async.eachSeries(
          componentsDirs,
          (dir, cb) => {
            const packageOptions = {
              componentPath: dir,
              minify: false,
              verbose: opts.verbose,
              production: opts.production
            };

            fromPromise(local.package)(packageOptions, (err: any) => {
              if (!err) i++;
              cb(err);
            });
          },
          error => {
            if (error) {
              const errorDescription =
                error instanceof SyntaxError || !!error.message
                  ? error.message
                  : error;
              logger.err(
                cliErrors.PACKAGING_FAIL(
                  componentsDirs[i],
                  String(errorDescription)
                )
              );
              logger.warn(cliMessages.RETRYING_10_SECONDS);
              setTimeout(() => {
                packaging = false;
                packageComponents(componentsDirs);
              }, 10000);
            } else {
              packaging = false;
              logger.ok('OK');
              cb();
            }
          }
        );
      }
    };

    const registerPlugins = (registry: Registry) => {
      const mockedPlugins = getMockedPlugins(logger, componentsDir);
      mockedPlugins.forEach(p => registry.register(p));

      registry.on(
        'request',
        (data: { errorCode: string; errorDetails: string }) => {
          if (data.errorCode === 'PLUGIN_MISSING_FROM_REGISTRY') {
            logger.err(
              cliErrors.PLUGIN_MISSING_FROM_REGISTRY(
                data.errorDetails,
                colors.blue(strings.commands.cli.MOCK_PLUGIN)
              )
            );
          }
        }
      );
    };

    logger.warn(cliMessages.SCANNING_COMPONENTS, true);
    fromPromise(local.getComponentsByDir)(
      componentsDir,
      (err: any, components) => {
        if (_.isEmpty(components)) {
          err = cliErrors.DEV_FAIL(cliErrors.COMPONENTS_NOT_FOUND) as any;
          logger.err(String(err));
          return callback(err, undefined as any);
        }

        logger.ok('OK');
        _.forEach(components, component =>
          logger.log(colors.green('├── ') + component)
        );

        handleDependencies({ components, logger }, (err, dependencies) => {
          if (err) {
            logger.err(err);
            return callback(err, undefined as any);
          }
          packageComponents(components, () => {
            async.waterfall(
              [
                (next: any) => {
                  if (hotReloading) {
                    getPort(port + 1, (error, otherPort) => {
                      if (error) {
                        return next(error);
                      }
                      const liveReloadServer = livereload.createServer({
                        port: otherPort
                      });
                      const refresher = () => liveReloadServer.refresh('/');
                      next(null, { refresher, port: otherPort });
                    });
                  } else {
                    next(null, { refresher: _.noop, port: null });
                  }
                }
              ],
              (err, liveReload: any) => {
                if (err) {
                  logger.err(String(err));
                  return callback(err, undefined as any);
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
                    cliMessages.REGISTRY_LIVERELOAD_STARTING(liveReload.port)
                  );
                }
                registry.start(err => {
                  if (err) {
                    if ((err as any).code === 'EADDRINUSE') {
                      err = cliErrors.PORT_IS_BUSY(port) as any;
                    }

                    logger.err(String(err));
                    return callback(err, undefined as any);
                  }

                  if (optWatch) {
                    watchForChanges(
                      { components, refreshLiveReload: liveReload.refresher },
                      packageComponents
                    );
                  }
                  callback(null, registry);
                });
              }
            );
          });
        });
      }
    );
  };

export default dev;

module.exports = dev;
