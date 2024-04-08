import { ParsedComponent, VM } from '../../../types';
import getSelectedCheckbox from './selected-checkbox';

export default function componentsList(vm: VM): string {
  const isLocal = vm.type !== 'oc-registry';
  const isRemote = !isLocal;
  const sizeAvailable = vm.components.some(
    (component) => component.oc.files.template.size
  );
  const selectedCheckbox = getSelectedCheckbox(vm);

  const remoteServerColumns = isRemote
    ? '<div class="date">Updated</div><div class="activity">Activity</div>'
    : '';
  const sizeColumn = sizeAvailable ? '<div>Size</div>' : '';

  const componentRow = (component: ParsedComponent) => {
    const componentState = component.oc.state
      ? `<div class="state component-state-${component.oc.state.toLowerCase()}">${
          component.oc.state
        }</div>`
      : '';

    const isHidden =
      component.oc.state === 'deprecated' ||
      component.oc.state === 'experimental';

    const remoteServerColumns = isRemote
      ? `<div class="date">${
          component.oc.stringifiedDate || ''
        }</div><div class="activity">${component.allVersions.length}</div>`
      : '';
    const sizeColumn = sizeAvailable
      ? component.oc.files.template.size
        ? `<div>${Math.round(component.oc.files.template.size / 1024)} kb</div>`
        : '<div>? Kb</div>'
      : '';

    return `<a href="${component.name}/${component.version}/~info">
  <div id="component-${component.name}" class="componentRow row table${
    isHidden ? ' hide' : ''
  }">
    <div class="title">
      <p class="name">${component.name}</p>
      <span class="description">${component.description}</span>
    </div>
    ${componentState}
    <div class="author">${component.author.name || ''}</div>
    <div>${component.version}</div>
    ${remoteServerColumns}
    ${sizeColumn}
  </div>
</a>`;
  };

  return `<div id="components-list" class="box">
  <form id="filter-components">
    <div class="filters">
      <input class="search-filter" type="text" placeholder="Filter by component name" />
      <input class="author-filter" type="text" placeholder="Filter by component author" />
    </div>
    <div class="states">
      <span>Hide:</span>
      ${selectedCheckbox('deprecated')}
      ${selectedCheckbox('experimental')}
    </div>
  </form>
  <div class="row header componentRow table">
    <div class="title"></div>
    <div class="author">Author</div>
    <div>Latest version</div>
    ${remoteServerColumns}
    ${sizeColumn}
  </div>
  ${vm.components.map(componentRow).join('')}
</div>`;
}
