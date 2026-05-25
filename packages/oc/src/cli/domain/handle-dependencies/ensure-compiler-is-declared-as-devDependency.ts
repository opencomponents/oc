import strings from '../../../resources';
import type { Component } from '../../../types';

export default function ensureCompilerIsDeclaredAsDevDependency(options: {
  componentPath: string;
  pkg: Component;
  template: string;
}): string {
  const { componentPath, pkg, template } = options;
  const compilerDep = `${template}-compiler`;
  const isOk = pkg.devDependencies?.[compilerDep];

  if (!isOk)
    throw strings.errors.cli.TEMPLATE_DEP_MISSING(template, componentPath);

  return compilerDep;
}
