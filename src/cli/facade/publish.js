'use strict';

const async = require('async');
const colors = require('colors/safe');
const format = require('stringformat');
const path = require('path');
const read = require('read');
const _ = require('lodash');

const loadDependencies = require('../domain/load-dependencies');
const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies) {
  const registry = dependencies.registry,
    local = dependencies.local,
    logger = dependencies.logger;

  return function(opts, callback) {
    const componentPath = opts.componentPath,
      packageDir = path.resolve(componentPath, '_package'),
      compressedPackagePath = path.resolve(componentPath, 'package.tar.gz');

    let errorMessage;

    callback = wrapCliCallback(callback);

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

    const packageAndCompress = function(cb) {
      logger.warn(format(strings.messages.cli.PACKAGING, packageDir));
      const packageOptions = {
        production: true,
        componentPath: path.resolve(componentPath)
      };
      local.package(packageOptions, (err, component) => {
        if (err) {
          return cb(err);
        }

        logger.warn(
          format(strings.messages.cli.COMPRESSING, compressedPackagePath)
        );

        local.compress(packageDir, compressedPackagePath, err => {
          if (err) {
            return cb(err);
          }
          cb(null, component);
        });
      });
    };

    const putComponentToRegistry = function(options, cb) {
      logger.warn(format(strings.messages.cli.PUBLISHING, options.route));

      registry.putComponent(options, err => {
        if (err) {
          if (err === 'Unauthorized') {
            if (!!options.username || !!options.password) {
              logger.err(
                format(
                  strings.errors.cli.PUBLISHING_FAIL,
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
            const upgradeCommand = format(
                strings.commands.cli.UPGRADE,
                err.details.suggestedVersion
              ),
              errorDetails = format(
                strings.errors.cli.OC_CLI_VERSION_NEEDS_UPGRADE,
                colors.blue(upgradeCommand)
              );

            errorMessage = format(
              strings.errors.cli.PUBLISHING_FAIL,
              errorDetails
            );
            logger.err(errorMessage);
            return cb(errorMessage);
          } else if (err.code === 'node_version_not_valid') {
            const details = format(
              strings.errors.cli.NODE_CLI_VERSION_NEEDS_UPGRADE,
              err.details.suggestedVersion
            );

            errorMessage = format(strings.errors.cli.PUBLISHING_FAIL, details);
            logger.err(errorMessage);
            return cb(errorMessage);
          } else {
            if (_.isObject(err)) {
              try {
                err = JSON.stringify(err);
              } catch (er) {}
            }
            errorMessage = format(strings.errors.cli.PUBLISHING_FAIL, err);
            logger.err(errorMessage);
            return cb(errorMessage);
          }
        } else {
          logger.ok(format(strings.messages.cli.PUBLISHED, options.route));
          return cb(null, 'ok');
        }
      });
    };

    registry.get((err, registryLocations) => {
      if (err) {
        logger.err(err);
        return callback(err);
      }

      loadDependencies(
        { components: [componentPath], logger },
        dependencies => {
          packageAndCompress((err, component) => {
            if (err) {
              errorMessage = format(
                strings.errors.cli.PACKAGE_CREATION_FAIL,
                err
              );
              logger.err(errorMessage);
              return callback(errorMessage);
            }

            async.eachSeries(
              registryLocations,
              (registryUrl, next) => {
                const registryLength = registryUrl.length,
                  registryNormalised =
                    registryUrl.slice(registryLength - 1) === '/'
                      ? registryUrl.slice(0, registryLength - 1)
                      : registryUrl,
                  componentRoute = format(
                    '{0}/{1}/{2}',
                    registryNormalised,
                    component.name,
                    component.version
                  );

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
          });
        }
      );
    });
  };
};
