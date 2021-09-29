import { VM } from '../../../types';

export default function componentsHistory(vm: VM) {
  const componentRow = ({
    name,
    publishDate,
    version
  }: {
    name: string;
    publishDate: string;
    version: string;
  }) =>
    `<a href="${name}/${version}/~info">
  <div class="componentRow row table">
    <p class="release">${publishDate} - Published ${name}@${version}</p>
  </div>
</a>`;

  const history = vm.componentsHistory || [];

  return `<div id="components-history" class="box">${history
    .map(componentRow)
    .join('')}</div>`;
}
