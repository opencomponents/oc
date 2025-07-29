import coreModules from 'builtin-modules';

import RequireWrapper from '../../domain/require-wrapper';

interface AvailableDependency {
  core: boolean;
  name: string;
  version?: string;
  link: string;
}

export default function getAvailableDependencies(
  dependencies: string[]
): AvailableDependency[] {
  return dependencies.map((dependency) => {
    const requirer = RequireWrapper(dependencies);
    const core = coreModules.includes(dependency);
    const packageJson = !core
      ? requirer<{ version: string; homepage: string }>(
          `${dependency}/package.json`
        )
      : undefined;
    const version = packageJson?.version;
    const link = core
      ? `https://nodejs.org/api/${dependency}.html`
      : (packageJson?.homepage ?? '');

    return { core, name: dependency, version, link };
  });
}
