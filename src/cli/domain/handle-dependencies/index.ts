import fs from 'node:fs/promises';
import path from 'node:path';
import coreModules from 'builtin-modules';

import strings from '../../../resources';
import type { Component, Template } from '../../../types';
import isTemplateLegacy from '../../../utils/is-template-legacy';
import type { Logger } from '../../logger';
import ensureCompilerIsDeclaredAsDevDependency from './ensure-compiler-is-declared-as-devDependency';
import getCompiler from './get-compiler';
import installMissingDependencies from './install-missing-dependencies';

const readJson = (path: string) => fs.readFile(path, 'utf8').then(JSON.parse);

const getComponentPackageJson = (componentPath: string): Promise<Component> =>
  readJson(path.join(componentPath, 'package.json'));

const union = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => [
  ...new Set([...a, ...b])
];

export default async function handleDependencies(options: {
  install?: boolean;
  components: string[];
  logger: Logger;
}): Promise<{
  modules: string[];
  templates: Array<Template>;
}> {
  const { components, logger } = options;

  const dependencies: Record<string, string> = {};
  const addDependencies = (componentDependencies?: Record<string, string>) => {
    for (const [dependency, version] of Object.entries(
      componentDependencies || {}
    )) {
      dependencies[dependency] = version;
    }
  };

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

  if (options.install) {
    await installMissingDependencies({ dependencies, logger });
  }
  return result;
}
