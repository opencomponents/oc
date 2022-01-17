import coreModules from 'builtin-modules';
import fs from 'fs-extra';
import path from 'path';

import ensureCompilerIsDeclaredAsDevDependency from './ensure-compiler-is-declared-as-devDependency';
import getCompiler from './get-compiler';
import installMissingDependencies from './install-missing-dependencies';
import linkMissingDependencies from './link-missing-dependencies';
import isTemplateLegacy from '../../../utils/is-template-legacy';
import strings from '../../../resources';
import { Logger } from '../../logger';
import { Component, Template } from '../../../types';

const getComponentPackageJson = (componentPath: string): Promise<Component> =>
  fs.readJson(path.join(componentPath, 'package.json'));

const union = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => [
  ...new Set([...a, ...b])
];

export default async function handleDependencies(options: {
  components: string[];
  logger: Logger;
  useComponentDependencies?: boolean;
}): Promise<{
  modules: string[];
  templates: Array<Template>;
}> {
  const { components, logger, useComponentDependencies } = options;

  const dependencies: Record<string, string> = {};
  const addDependencies = (componentDependencies?: Record<string, string>) =>
    Object.entries(componentDependencies || {}).forEach(
      ([dependency, version]) => {
        dependencies[dependency] = version;
      }
    );

  const templates: Record<string, Template> = {};
  const addTemplate = (templateName: string, template: Template) => {
    templates[templateName] = template;
  };

  const setupComponentDependencies = async (
    componentPath: string
  ): Promise<void> => {
    const pkg = await getComponentPackageJson(componentPath);
    addDependencies(pkg.dependencies);

    const template = pkg.oc.files.template.type;
    if (isTemplateLegacy(template)) {
      return;
    }

    const compilerDep = ensureCompilerIsDeclaredAsDevDependency({
      componentPath,
      pkg,
      template
    });
    Object.assign(options, { compilerDep });

    const compiler = await getCompiler({
      compilerDep,
      componentPath,
      logger,
      pkg: pkg as { devDependencies: Record<string, string> }
    });
    Object.assign(options, { compiler });
    addTemplate(template, compiler);
  };

  logger.warn(strings.messages.cli.CHECKING_DEPENDENCIES);

  for (const component of components) {
    await setupComponentDependencies(component);
  }

  const result = {
    modules: union(coreModules, Object.keys(dependencies)).sort(),
    templates: Object.values(templates)
  };
  if (useComponentDependencies) {
    linkMissingDependencies({
      componentPath: components[0],
      dependencies,
      logger
    });
    return result;
  }

  await installMissingDependencies({ dependencies, logger });
  return result;
}
