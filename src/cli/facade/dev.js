'use strict';

const async = require('async');
const colors = require('colors/safe');
const format = require('stringformat');
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
  const local = dependencies.local,
    logger = dependencies.logger;

  return function(opts, callback) {
    const componentsDir = opts.dirPath,
      port = opts.port || 3000,
      baseUrl = opts.baseUrl || format('http://localhost:{0}/', port),
      errors = strings.errors.cli,
      fallbackRegistryUrl = opts.fallbackRegistryUrl,
      hotReloading = _.isUndefined(opts.hotReloading)
        ? true
        : opts.hotReloading,
      optWatch = _.isUndefined(opts.watch) ? true : opts.watch;
    let packaging = false;

    callback = wrapCliCallback(callback);

    const watchForChanges = function({ components, liveReloadServer }, cb) {
      watch(components, componentsDir, (err, changedFile, componentDir) => {
        if (err) {
          logger.err(format(strings.errors.generic, err));
        } else {
          logger.warn(
            format(strings.messages.cli.CHANGES_DETECTED, changedFile)
          );
          if (!hotReloading) {
            logger.warn(strings.messages.cli.HOT_RELOADING_DISABLED);
          } else if (!componentDir) {
            cb(components, done => liveReloadServer.refresh('/'));
          } else {
            cb([componentDir], done => liveReloadServer.refresh('/'));
          }
        }
      });
    };

    const packageComponents = function(componentsDirs, cb) {
      cb = _.isFunction(cb) ? cb : _.noop;

      let i = 0;

      if (!packaging) {
        packaging = true;
        logger.warn(strings.messages.cli.PACKAGING_COMPONENTS, true);

        async.eachSeries(
          componentsDirs,
          (dir, cb) => {
            const packageOptions = {
              componentPath: dir,
              minify: false,
              verbose: opts.verbose,
              production: opts['production']
            };

            local.package(packageOptions, err => {
              if (!err) {
                i++;
              }
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
                  strings.errors.cli.PACKAGING_FAIL,
                  componentsDirs[i],
                  errorDescription
                )
              );
              logger.warn(strings.messages.cli.RETRYING_10_SECONDS);
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
              strings.errors.cli.PLUGIN_MISSING_FROM_REGISTRY,
              data.errorDetails,
              colors.blue(strings.commands.cli.MOCK_PLUGIN)
            )
          );
        }
      });
    };

    logger.warn(strings.messages.cli.SCANNING_COMPONENTS, true);
    local.getComponentsByDir(componentsDir, (err, components) => {
      if (_.isEmpty(components)) {
        err = format(errors.DEV_FAIL, errors.COMPONENTS_NOT_FOUND);
        callback(err);
        return logger.err(err);
      }

      logger.ok('OK');
      _.forEach(components, component => {
        logger.log(colors.green('├── ') + component);
      });

      handleDependencies({ components, logger }, (err, dependencies) => {
        if (err) {
          logger.err(err);
          return callback(err);
        }
        packageComponents(components, () => {
          const liveReloadServer = livereload.createServer({ port: port + 1 });

          const registry = new oc.Registry({
            baseUrl,
            prefix: opts.prefix || '',
            dependencies: dependencies.modules,
            discovery: true,
            env: { name: 'local' },
            fallbackRegistryUrl,
            hotReloading,
            local: true,
            path: path.resolve(componentsDir),
            port,
            templates: dependencies.templates,
            verbosity: 1
          });

          registerPlugins(registry);

          logger.warn(format(strings.messages.cli.REGISTRY_STARTING, baseUrl));
          registry.start(err => {
            if (err) {
              if (err.code === 'EADDRINUSE') {
                err = format(strings.errors.cli.PORT_IS_BUSY, port);
              }

              logger.err(err);
              return callback(err);
            }

            if (optWatch) {
              watchForChanges(
                { components, liveReloadServer },
                packageComponents
              );
            }
            callback(null, registry);
          });
        });
      });
    });
  };
};
