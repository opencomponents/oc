import path from 'node:path';

import strings from '../../../resources';
import type { Component } from '../../../types';
import cleanRequire from '../../../utils/clean-require';
import isTemplateLegacy from '../../../utils/is-template-legacy';
import isTemplateValid from '../../../utils/is-template-valid';

interface Template {
  compile: (
    opts: {
      publishPath: string;
      componentPath: string;
      componentPackage: any;
      ocPackage: any;
      minify: boolean;
      verbose: boolean;
      production: boolean | undefined;
    },
    cb: (err: Error | null, data: Component) => void
  ) => void;
}

export default function requireTemplate(
  template: string,
  options: { compiler: boolean; componentPath: string }
): Template {
  const requireOptions = options || {};
  let ocTemplate: Template | undefined;

  if (isTemplateLegacy(template)) {
    template = `oc-template-${template}`;
  }

  if (requireOptions.compiler) {
    template = `${template}-compiler`;
  }

  const localTemplate = path.join(
    __dirname,
    '../../../../node_modules',
    template
  );
  const relativeTemplate = path.resolve('.', 'node_modules', template);
  const componentRelativePath = path.join(
    requireOptions.componentPath,
    'node_modules',
    template
  );

  for (const pathToTry of [
    componentRelativePath,
    template,
    localTemplate,
    relativeTemplate
  ]) {
    ocTemplate = ocTemplate || cleanRequire(pathToTry, { justTry: true });
  }

  if (!ocTemplate) {
    throw new Error(strings.errors.cli.TEMPLATE_NOT_FOUND(template));
  }

  if (!isTemplateValid(ocTemplate, requireOptions)) {
    throw new Error(strings.errors.cli.TEMPLATE_TYPE_NOT_VALID(template));
  }

  return ocTemplate;
}
