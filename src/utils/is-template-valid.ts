import { Template } from '../types';

export default function isTemplateValid(
  template: unknown,
  options?: { compiler: boolean }
): template is Template {
  if (!template) {
    return false;
  }

  const api = ['getInfo', 'getCompiledTemplate', 'render'];

  if (options && options.compiler === true) {
    api.push('compile');
  }

  return api.every(
    method => typeof (template as Template)[method] === 'function'
  );
}
