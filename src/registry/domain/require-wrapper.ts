import path from 'node:path';
import coreModules from 'builtin-modules';
import requirePackageName from 'require-package-name';
import tryRequire from 'try-require';

import strings from '../../resources';

const allCoreModules = [...coreModules, ...coreModules.map((m) => `node:${m}`)];

const isCoreDependency = (x: string) => allCoreModules.includes(x);
const requireCoreDependency = (x: string) =>
  (isCoreDependency(x) && tryRequire(x)) || undefined;

const requireDependency = (requirePath: string) => {
  const nodeModulesPath = path.resolve('.', 'node_modules');
  const modulePath = path.resolve(nodeModulesPath, requirePath);
  return tryRequire(modulePath);
};

const throwError = (requirePath: string) => {
  throw {
    code: strings.errors.registry.DEPENDENCY_NOT_FOUND_CODE,
    missing: [requirePath]
  };
};

export default (injectedDependencies: string[]) =>
  <T = unknown>(requirePath: string): T => {
    const moduleName = requirePackageName(requirePath);
    const isAllowed = injectedDependencies.includes(moduleName);

    if (!isAllowed) {
      return throwError(requirePath);
    }

    return (
      requireDependency(requirePath) ||
      requireCoreDependency(requirePath) ||
      throwError(requirePath)
    );
  };
