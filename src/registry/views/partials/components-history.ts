import { VM } from '../../../types';

export default function componentsHistory(vm: VM): string {
  const componentRow = ({
    name,
    publishDate,
    version,
    templateSize
  }: {
    name: string;
    templateSize?: number;
    publishDate: string;
    version: string;
  }) => {
    return `<a href="${name}/${version}/~info">
  <div class="componentRow row table">
    <p class="release">${publishDate} - Published ${name}@${version}${templateSize ? ` [${Math.round(templateSize / 1024)} kb]` : ''}</p>
  </div>
</a>`;
  };

  const history = vm.componentsHistory || [];

  return `<div id="components-history" class="box">${history
    .map(componentRow)
    .join('')}</div>`;
}
