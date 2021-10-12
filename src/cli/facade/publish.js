'use strict';

const async = require('async');
const colors = require('colors/safe');
const path = require('path');
const fs = require('fs-extra');
const read = require('read');
const _ = require('lodash');

const handleDependencies = require('../domain/handle-dependencies').default;
const strings = require('../../resources/index').default;

module.exports = function(dependencies) {
  const registry = dependencies.registry,
    local = dependencies.local,
    logger = dependencies.logger;

  return function(opts, callback) {
    const componentPath = opts.componentPath,
      skipPackage = opts.skipPackage,
      packageDir = path.resolve(componentPath, '_package'),
      compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    let errorMessage;

    const readPackageJson = cb =>
      fs.readJson(path.join(packageDir, 'package.json'), cb);

    const getCredentials = function(cb) {
      if (opts.username && opts.password) {
        logger.ok(strings.messages.cli.USING_CREDS);
        return cb(null, _.pick(opts, 'username', 'password'));
      }

      logger.warn(strings.messages.cli.ENTER_USERNAME);

      read({}, (err, username) => {
        logger.warn(strings.messages.cli.ENTER_PASSWORD);

        read({ silent: true }, (err, password) => {
          cb(null, { username: username, password: password });
        });
      });
    };

    const compress = cb => {
      local.compress(packageDir, compressedPackagePath, cb);
    };

    const packageAndCompress = function(cb) {
      logger.warn(strings.messages.cli.PACKAGING(packageDir));
      const packageOptions = {
        production: true,
        componentPath: path.resolve(componentPath)
      };

      local.package(packageOptions, (err, component) => {
        if (err) {
          return cb(err);
        }

        logger.warn(strings.messages.cli.COMPRESSING(compressedPackagePath));

        compress(err => {
          if (err) {
            return cb(err);
          }
          cb(null, component);
        });
      });
    };

    const putComponentToRegistry = function(options, cb) {
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
              return cb(err);
            }

            logger.warn(strings.messages.cli.REGISTRY_CREDENTIALS_REQUIRED);

            return getCredentials((err, credentials) => {
              putComponentToRegistry(_.extend(options, credentials), cb);
            });
          } else if (err.code === 'cli_version_not_valid') {
            const upgradeCommand = strings.commands.cli.UPGRADE(
                err.details.suggestedVersion
              ),
              errorDetails = strings.errors.cli.OC_CLI_VERSION_NEEDS_UPGRADE(
                colors.blue(upgradeCommand)
              );

            errorMessage = strings.errors.cli.PUBLISHING_FAIL(errorDetails);
            logger.err(errorMessage);
            return cb(errorMessage);
          } else if (err.code === 'node_version_not_valid') {
            const details = strings.errors.cli.NODE_CLI_VERSION_NEEDS_UPGRADE(
              err.details.suggestedVersion
            );

            errorMessage = strings.errors.cli.PUBLISHING_FAIL(details);
            logger.err(errorMessage);
            return cb(errorMessage);
          } else {
            if (_.isObject(err)) {
              try {
                err = JSON.stringify(err);
              } catch (er) {}
            }
            errorMessage = strings.errors.cli.PUBLISHING_FAIL(err);
            logger.err(errorMessage);
            return cb(errorMessage);
          }
        } else {
          logger.ok(strings.messages.cli.PUBLISHED(options.route));
          return cb(null, 'ok');
        }
      });
    };

    const publishToRegistries = (registryLocations, component) => {
      async.eachSeries(
        registryLocations,
        (registryUrl, next) => {
          const registryNormalised = registryUrl.replace(/\/$/, ''),
            componentRoute = `${registryNormalised}/${component.name}/${component.version}`;
          putComponentToRegistry(
            { route: componentRoute, path: compressedPackagePath },
            next
          );
        },
        err => {
          local.cleanup(compressedPackagePath, (err2, res) => {
            if (err) {
              return callback(err);
            }
            callback(err2, res);
          });
        }
      );
    };

    registry.get((err, registryLocations) => {
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
                errorMessage = strings.errors.cli.PACKAGE_CREATION_FAIL(err);
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
              logger.err(err);
              return callback(err);
            }
            compress(err => {
              if (err) {
                logger.err(err);
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
};
