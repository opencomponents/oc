'use strict';

const async = require('async');
const colors = require('colors/safe');
const format = require('stringformat');
const getPort = require('getport');
const livereload = require('livereload');
const path = require('path');
const _ = require('lodash');

const getMockedPlugins = require('../domain/get-mocked-plugins');
const handleDependencies = require('../domain/handle-dependencies');
const oc = require('../../index');
const strings = require('../../resources/index');
const watch = require('../domain/watch');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies) {
  const { local, logger } = dependencies;
  const cliMessages = strings.messages.cli;
  const cliErrors = strings.errors.cli;

  return function(opts, callback) {
    const componentsDir = opts.dirPath,
      port = opts.port || 3000,
      baseUrl = opts.baseUrl || `http://localhost:${port}/`,
      fallbackRegistryUrl = opts.fallbackRegistryUrl,
      hotReloading = _.isUndefined(opts.hotReloading)
        ? true
        : opts.hotReloading,
      optWatch = _.isUndefined(opts.watch) ? true : opts.watch;
    let packaging = false;

    callback = wrapCliCallback(callback);

    const watchForChanges = function({ components, refreshLiveReload }, cb) {
      watch(components, componentsDir, (err, changedFile, componentDir) => {
        if (err) {
          logger.err(format(strings.errors.generic, err));
        } else {
          logger.warn(format(cliMessages.CHANGES_DETECTED, changedFile));
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

    const packageComponents = function(componentsDirs, cb) {
      cb = _.isFunction(cb) ? cb : _.noop;

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

            local.package(packageOptions, err => {
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
                format(
                  cliErrors.PACKAGING_FAIL,
                  componentsDirs[i],
                  errorDescription
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

    const registerPlugins = registry => {
      const mockedPlugins = getMockedPlugins(logger, componentsDir);
      mockedPlugins.forEach(p => registry.register(p));

      registry.on('request', data => {
        if (data.errorCode === 'PLUGIN_MISSING_FROM_REGISTRY') {
          logger.err(
            format(
              cliErrors.PLUGIN_MISSING_FROM_REGISTRY,
              data.errorDetails,
              colors.blue(strings.commands.cli.MOCK_PLUGIN)
            )
          );
        }
      });
    };

    logger.warn(cliMessages.SCANNING_COMPONENTS, true);
    local.getComponentsByDir(componentsDir, (err, components) => {
      if (_.isEmpty(components)) {
        err = format(cliErrors.DEV_FAIL, cliErrors.COMPONENTS_NOT_FOUND);
        callback(err);
        return logger.err(err);
      }

      logger.ok('OK');
      _.forEach(components, component =>
        logger.log(colors.green('├── ') + component)
      );

      handleDependencies({ components, logger }, (err, dependencies) => {
        if (err) {
          logger.err(err);
          return callback(err);
        }
        packageComponents(components, () => {
          async.waterfall(
            [
              next => {
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
            (err, liveReload) => {
              if (err) {
                logger.err(err);
                return callback(err);
              }

              const registry = new oc.Registry({
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

              logger.warn(format(cliMessages.REGISTRY_STARTING, baseUrl));
              if (liveReload.port) {
                logger.warn(
                  format(
                    cliMessages.REGISTRY_LIVERELOAD_STARTING,
                    liveReload.port
                  )
                );
              }
              registry.start(err => {
                if (err) {
                  if (err.code === 'EADDRINUSE') {
                    err = format(cliErrors.PORT_IS_BUSY, port);
                  }

                  logger.err(err);
                  return callback(err);
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
    });
  };
};
