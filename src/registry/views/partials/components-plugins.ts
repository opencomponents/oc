import { VM } from '../../../types';

export default function componentsPlugins(vm: VM): string {
  const pluginRow = ([name, description]: string[]) => `<div class="componentRow row table">
    <p class="release">
      <span style="font-weight: bold">${
        name + (description ? ':' : '')
      }</span>${description}
    </p>
  </div>
`;

  const plugins = Object.entries(vm.availablePlugins).map(
    ([pluginName, fn]) => [pluginName, fn.toString()]
  );

  return `<div id="components-plugins" class="box">${
    plugins.length ? plugins.map(pluginRow).join('') : 'No plugins registered'
  }</div>`;
}
