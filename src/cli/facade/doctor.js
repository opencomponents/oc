'use strict';

const async = require('async');
const fs = require('fs-extra');
const _ = require('lodash');

const ensureCompilerIsDeclaredAsDevDependency = require('../domain/handle-dependencies/ensure-compiler-is-declared-as-devDependency');
const isTemplateLegacy = require('../../utils/is-template-legacy');
const wrapCliCallback = require('../wrap-cli-callback');

const getComponentPackageJson = (componentPath, cb) =>
  fs.readJson(path.join(componentPath, 'package.json'), cb);

module.exports = function(dependencies) {
  const { local, logger } = dependencies;

  return function(opts, callback) {
    callback = wrapCliCallback(callback);

    const issues = {
      compilers: {
        noDevDependencies: [],
        multipleCompilerVersions: [],
        multipleDependencyVersions: {}
      }
    };

    const dependencies = {};
    const addDependencies = componentDependencies =>
      _.each(componentDependencies || {}, (version, dependency) => {
        if (depedencies[dependency] && dependencies[dependency] !== version) {
          issues.compilers.multipleDependencyVersions[dependency] = _.uniq([
            ...issues.compilers.multipleDependencyVersions[dependency],
            version,
            dependencies[dependency]
          ]);
        }
        dependencies[dependency] = version;
      });

    const compilers = {};
    const addCompiler = compiler => {
      compilers[compiler.name] = compilers[compiler.name] || [];
      compilers[compiler.name].push(compiler.version);
    };

    local.getComponentsByDir(opts.dirPath, (err, components) => {
      if (err) {
        logger.err('no components');
        return callback('no components');
      }

      const processComponent = (componentPath, done) =>
        async.waterfall(
          [
            cb => getComponentPackageJson(componentPath, cb),
            (pkg, cb) => {
              addDependencies(pkg.dependencies);

              const template = pkg.oc.files.template.type;
              if (isTemplateLegacy(template)) {
                console.log('alert legacy');
                return done();
              }

              cb(null, { componentPath, logger, pkg, template });
            },
            (options, cb) =>
              ensureCompilerIsDeclaredAsDevDependency(
                options,
                (err, compilerDep) => {
                  if (err) {
                    issues.compilers.noDevDependencies.push(options.pkg);
                  } else {
                    addCompiler({
                      name: compilerDep,
                      version: pkg.devDependencies[compilerDep]
                    });
                  }
                  cb();
                }
              )
          ],
          done
        );

      console.log(components);
      callback(null);
    });
  };
};
