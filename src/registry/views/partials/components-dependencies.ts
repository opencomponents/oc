import type { VM } from '../../../types';

export default function componentsDependencies(vm: VM): string {
  const dependencyRow = ({
    core,
    link,
    name,
    version
  }: {
    core: boolean;
    link: string;
    name: string;
    version: string;
  }) => {
    const label = name + (core ? ' (node.js core dependency)' : `@${version}`);
    return `<a href="${link}" target="_blank">
  <div class="componentRow row table">
    <p class="release">${label}</p>
  </div>
</a>`;
  };

  return `<div id="components-dependencies" class="box">${vm.availableDependencies
    .map(dependencyRow)
    .join('')}</div>`;
}
