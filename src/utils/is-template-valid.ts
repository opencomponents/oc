import { Template } from '../types';

export default function isTemplateValid(
  template: unknown,
  options?: { compiler: boolean }
): template is Template {
  if (!template) {
    return false;
  }

  const templateApi = ['getInfo', 'getCompiledTemplate', 'render'] as const;
  const compilerApi = [...templateApi, 'compile'] as const;

  const api = options && options.compiler === true ? compilerApi : templateApi;

  return api.every(
    (method) => typeof (template as Template)[method] === 'function'
  );
}
