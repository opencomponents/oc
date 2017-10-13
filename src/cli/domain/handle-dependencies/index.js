'use strict';

const async = require('async');
const format = require('stringformat');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const cleanRequire = require('../../../utils/clean-require');
const getMissingDependencies = require('./get-missing-dependencies');
const installCompiler = require('./install-compiler');
const installMissingDependencies = require('./install-missing-dependencies');
const isTemplateValid = require('../../../utils/is-template-valid');
const strings = require('../../../resources');

const getComponentPackageJson = (componentPath, cb) =>
  fs.readJson(path.join(componentPath, 'package.json'), cb);

const isTemplateLegacy = template =>
  template === 'jade' || template === 'handlebars';

module.exports = (options, callback) => {
  const { components, logger } = options;
  const templates = {};
  const dependencies = {};

  logger.warn(strings.messages.cli.CHECKING_DEPENDENCIES);
  async.eachSeries(
    components,
    (componentPath, next) => {
      async.waterfall(
        [
          cb => getComponentPackageJson(componentPath, cb),
          (pkg, cb) => {
            _.each(pkg.dependencies || {}, (version, dependency) => {
              dependencies[dependency] = version;
            });

            const template = pkg.oc.files.template.type;
            const compilerDep = `${template}-compiler`;
            const isLegacy = isTemplateLegacy(template);
            if (isLegacy) {
              return cb(null, { pkg, isLegacy });
            } else if (!pkg.devDependencies[compilerDep]) {
              return cb(
                format(
                  strings.errors.cli.TEMPLATE_DEP_MISSING,
                  template,
                  componentPath
                )
              );
            }
            cb(null, { compilerDep, isLegacy, pkg, template });
          },
          (options, cb) => {
            if (options.isLegacy) {
              return cb(null, options);
            }
            const { compilerDep, pkg } = options;
            const compilerPath = path.join(
              componentPath,
              'node_modules',
              compilerDep
            );
            const compiler = cleanRequire(compilerPath, { justTry: true });

            if (compiler) {
              return cb(null, _.extend(options, { compiler }));
            }

            let dependency = compilerDep;
            if (pkg.devDependencies[compilerDep]) {
              dependency += `@${pkg.devDependencies[compilerDep]}`;
            }

            installCompiler(
              {
                compilerPath,
                componentName: pkg.name,
                componentPath,
                dependency,
                logger
              },
              (err, compiler) => cb(err, _.extend(options, { compiler }))
            );
          },
          (options, cb) => {
            if (options.isLegacy) {
              return cb();
            }

            const { compiler, pkg, template } = options;
            if (!compiler) {
              return cb('Cannot require compiler');
            } else if (!isTemplateValid(compiler)) {
              return cb('There was a problem while installing the compiler');
            }

            templates[template] = compiler;
            cb();
          }
        ],
        next
      );
    },
    err => {
      if (err) {
        return callback(err);
      }

      const result = {
        modules: _.keys(dependencies),
        templates: _.values(templates)
      };

      const missing = getMissingDependencies(dependencies);

      if (_.isEmpty(missing)) {
        return callback(null, result);
      }

      const installOptions = {
        allDependencies: dependencies,
        logger,
        missingDependencies: missing
      };

      installMissingDependencies(installOptions, err => callback(err, result));
    }
  );
};
