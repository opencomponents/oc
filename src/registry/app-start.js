'use strict';

const colors = require('colors/safe');
const format = require('stringformat');
const path = require('path');
const _ = require('lodash');

const packageInfo = require('../components/oc-client/_package/package');

module.exports = function(repository, options, callback) {
  if (options.local) {
    return callback(null, 'ok');
  }

  const logger = options.verbosity ? console : { log: _.noop };

  logger.log(
    format(
      colors.yellow('Connecting to library: {0}/{1}'),
      options.storage.options.bucket,
      options.storage.options.componentsDir
    )
  );

  repository.getComponentVersions('oc-client', (err, componentInfo) => {
    if (err) {
      return logger.log(colors.red(err));
    }

    logger.log(
      format(
        colors.yellow('Ensuring oc-client@{0} is available on library...'),
        packageInfo.version
      )
    );

    if (!_.includes(componentInfo, packageInfo.version)) {
      logger.log(colors.yellow('Component not found. Publishing it...'));

      const pkgInfo = {
        outputFolder: path.resolve(
          __dirname,
          '../components/oc-client/_package'
        ),
        packageJson: packageInfo
      };

      repository.publishComponent(
        pkgInfo,
        'oc-client',
        packageInfo.version,
        (err, res) => {
          if (!err) {
            logger.log(colors.green('Component published.'));
          } else {
            logger.log(
              colors.red(format('Component not published: {0}', err.message))
            );
          }

          callback(err, res);
        }
      );
    } else {
      logger.log(colors.green('Component is available on library.'));
      callback(null, 'ok');
    }
  });
};
