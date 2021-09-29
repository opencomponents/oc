'use strict';

import path from 'path';

import cleanRequire from '../../../utils/clean-require';
import isTemplateLegacy from '../../../utils/is-template-legacy';
import isTemplateValid from '../../../utils/is-template-valid';
import strings from '../../../resources';

export default function requireTemplate(
  template: string,
  options: { compiler: boolean; componentPath: string }
) {
  const requireOptions = options || {};
  let ocTemplate;

  if (isTemplateLegacy(template)) {
    template = `oc-template-${template}`;
  }

  if (requireOptions.compiler) {
    template = `${template}-compiler`;
  }

  const localTemplate = path.join(__dirname, '../../node_modules', template);
  const relativeTemplate = path.resolve('.', 'node_modules', template);
  const componentRelativePath = path.join(
    requireOptions.componentPath,
    'node_modules',
    template
  );

  [componentRelativePath, template, localTemplate, relativeTemplate].forEach(
    pathToTry => {
      ocTemplate = ocTemplate || cleanRequire(pathToTry, { justTry: true });
    }
  );

  if (!ocTemplate) {
    throw new Error(strings.errors.cli.TEMPLATE_NOT_FOUND(template));
  }

  if (!isTemplateValid(ocTemplate, requireOptions)) {
    throw new Error(strings.errors.cli.TEMPLATE_TYPE_NOT_VALID(template));
  }

  return ocTemplate;
}
