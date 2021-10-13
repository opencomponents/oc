import async from 'async';
import coreModules from 'builtin-modules';
import fs from 'fs-extra';
import path from 'path';
import { fromPromise } from 'universalify';

import ensureCompilerIsDeclaredAsDevDependency from './ensure-compiler-is-declared-as-devDependency';
import getCompiler from './get-compiler';
import installMissingDependencies from './install-missing-dependencies';
import linkMissingDependencies from './link-missing-dependencies';
import isTemplateLegacy from '../../../utils/is-template-legacy';
import strings from '../../../resources';
import { Logger } from '../../logger';
import { Component } from '../../../types';

const getComponentPackageJson = (
  componentPath: string,
  cb: Callback<Component>
) => fs.readJson(path.join(componentPath, 'package.json'), cb);

const union = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => [
  ...new Set([...a, ...b])
];

export default function handleDependencies(
  options: {
    components: string[];
    logger: Logger;
    useComponentDependencies?: boolean;
  },
  callback: Callback<
    {
      modules: string[];
      templates: Array<(...args: unknown[]) => unknown>;
    },
    string
  >
): void {
  const { components, logger, useComponentDependencies } = options;

  const dependencies: Dictionary<string> = {};
  const addDependencies = (componentDependencies?: Dictionary<string>) =>
    Object.entries(componentDependencies || {}).forEach(
      ([dependency, version]) => {
        dependencies[dependency] = version;
      }
    );

  const templates: Dictionary<(...args: unknown[]) => unknown> = {};
  const addTemplate = (
    templateName: string,
    template: (...args: unknown[]) => unknown
  ) => {
    templates[templateName] = template;
  };

  const setupComponentDependencies = (
    componentPath: string,
    done: (err?: unknown) => void
  ) =>
    async.waterfall(
      [
        (cb: Callback<Component>) => getComponentPackageJson(componentPath, cb),
        (
          pkg: Component,
          cb: Callback<{
            componentPath: string;
            logger: Logger;
            pkg: Component;
            template: string;
          }>
        ) => {
          addDependencies(pkg.dependencies);

          const template = pkg.oc.files.template.type;
          if (isTemplateLegacy(template)) {
            return done();
          }

          cb(null, { componentPath, logger, pkg, template });
        },

        (
          options: {
            componentPath: string;
            logger: Logger;
            pkg: Component;
            template: string;
          },
          cb: any
        ) =>
          ensureCompilerIsDeclaredAsDevDependency(options, (err, compilerDep) =>
            cb(err, Object.assign(options, { compilerDep }))
          ),

        (
          options: {
            componentPath: string;
            logger: Logger;
            pkg: Component & { devDependencies: Dictionary<string> };
            template: string;
            compilerDep: string;
          },
          cb: any
        ) =>
          fromPromise(getCompiler)(options, (err, compiler) =>
            cb(err, Object.assign(options, { compiler }))
          ),

        (
          options: {
            compiler: (...args: unknown[]) => unknown;
            template: string;
          },
          cb: any
        ) => {
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
      return callback(err as any, undefined as any);
    }

    const result = {
      modules: union(coreModules, Object.keys(dependencies)).sort(),
      templates: Object.values(templates)
    };
    const options = { dependencies, logger };
    if (useComponentDependencies) {
      return fromPromise(linkMissingDependencies)(
        { ...options, componentPath: components[0] },
        (err: any) => callback(err, result)
      );
    }
    fromPromise(installMissingDependencies)(options, err =>
      callback(err as any, result)
    );
  });
}
