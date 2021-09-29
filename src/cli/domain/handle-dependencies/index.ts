import async from 'async';
import coreModules from 'builtin-modules';
import fs from 'fs-extra';
import path from 'path';
import _ from 'lodash';

import ensureCompilerIsDeclaredAsDevDependency from './ensure-compiler-is-declared-as-devDependency';
import getCompiler from './get-compiler';
import installMissingDependencies from './install-missing-dependencies';
import linkMissingDependencies from './link-missing-dependencies';
import isTemplateLegacy from '../../../utils/is-template-legacy';
import strings from '../../../resources';
import { Logger } from '../../logger';

const getComponentPackageJson = (componentPath: string, cb: Callback<any>) =>
  fs.readJson(path.join(componentPath, 'package.json'), cb);

export default function handleDependencies(
  options: {
    components: string[];
    logger: Logger;
    useComponentDependencies?: boolean;
  },
  callback: Callback<
    {
      modules: string[];
      templates: Function[];
    },
    string
  >
) {
  const { components, logger, useComponentDependencies } = options;

  const dependencies = {};
  const addDependencies = (componentDependencies: Dictionary<string>) =>
    _.each(componentDependencies || {}, (version, dependency) => {
      dependencies[dependency] = version;
    });

  const templates: Dictionary<Function> = {};
  const addTemplate = (templateName: string, template: Function) => {
    templates[templateName] = template;
  };

  const setupComponentDependencies = (componentPath: string, done) =>
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
      return callback(err, undefined as any);
    }

    const result = {
      modules: _.union(coreModules, Object.keys(dependencies)).sort(),
      templates: Object.values(templates)
    };
    const options = { dependencies, logger };
    if (useComponentDependencies) {
      // @ts-ignore
      options.componentPath = components[0];
      return linkMissingDependencies(options as any, err =>
        callback(err, result)
      );
    }
    installMissingDependencies(options, err => callback(err, result));
  });
}
