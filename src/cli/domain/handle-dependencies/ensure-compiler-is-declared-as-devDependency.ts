import strings from '../../../resources';
import { Component } from '../../../types';

export default function ensureCompilerIsDeclaredAsDevDependency(
  options: {
    componentPath: string;
    pkg: Component;
    template: string;
  },
  cb: Callback<string, string>
): void {
  const { componentPath, pkg, template } = options;
  const compilerDep = `${template}-compiler`;
  const isOk = pkg.devDependencies?.[compilerDep];

  const err = isOk
    ? null
    : strings.errors.cli.TEMPLATE_DEP_MISSING(template, componentPath);

  cb(err, compilerDep);
}
