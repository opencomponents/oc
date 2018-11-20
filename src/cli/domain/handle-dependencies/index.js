'use strict';

const async = require('async');
const coreModules = require('builtin-modules');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const ensureCompilerIsDeclaredAsDevDependency = require('./ensure-compiler-is-declared-as-devDependency');
const getCompiler = require('./get-compiler');
const installMissingDependencies = require('./install-missing-dependencies');
const linkMissingDependencies = require('./link-missing-dependencies');
const isTemplateLegacy = require('../../../utils/is-template-legacy');
const strings = require('../../../resources');

const getComponentPackageJson = (componentPath, cb) =>
  fs.readJson(path.join(componentPath, 'package.json'), cb);

module.exports = (options, callback) => {
  const { components, logger, useComponentDependencies } = options;

  const dependencies = {};
  const addDependencies = componentDependencies =>
    _.each(componentDependencies || {}, (version, dependency) => {
      dependencies[dependency] = version;
    });

  const templates = {};
  const addTemplate = (templateName, template) => {
    templates[templateName] = template;
  };

  const setupComponentDependencies = (componentPath, done) =>
    async.waterfall(
      [
        cb => getComponentPackageJson(componentPath, cb),
        (pkg, cb) => {
          addDependencies(pkg.dependencies);

          const template = pkg.oc.files.template.type;
          if (isTemplateLegacy(template)) {
            return done();
          }

          cb(null, { componentPath, logger, pkg, template });
        },

        (options, cb) =>
          ensureCompilerIsDeclaredAsDevDependency(options, (err, compilerDep) =>
            cb(err, _.extend(options, { compilerDep }))
          ),

        (options, cb) =>
          getCompiler(options, (err, compiler) =>
            cb(err, _.extend(options, { compiler }))
          ),

        (options, cb) => {
          const { compiler, template } = options;
          addTemplate(template, compiler);
          cb();
        }
      ],
      done
    );

  logger.warn(strings.messages.cli.CHECKING_DEPENDENCIES);
  async.eachSeries(components, setupComponentDependencies, err => {
    if (err) {
      return callback(err);
    }

    const result = {
      modules: _.union(coreModules, _.keys(dependencies)).sort(),
      templates: _.values(templates)
    };
    const options = { dependencies, logger };
    if (useComponentDependencies) {
      options.componentPath = components[0];
      return linkMissingDependencies(options, err => callback(err, result));
    }
    installMissingDependencies(options, err => callback(err, result));
  });
};
