import type { ParsedComponent, VM } from '../../../types';
import SelectedCheckbox from './selected-checkbox';

const ComponentsList = (props: {
  type: VM['type'];
  components: ParsedComponent[];
  stateCounts: VM['stateCounts'];
}) => {
  const isLocal = props.type !== 'oc-registry';
  const isRemote = !isLocal;
  const sizeAvailable = props.components.some(
    (component) => component.oc.files.template.size
  );

  const remoteServerColumns = isRemote
    ? [<div class="date">Updated</div>, <div class="activity">Activity</div>]
    : null;
  const sizeColumn = sizeAvailable ? <div>Size</div> : null;

  const componentRow = (component: ParsedComponent) => {
    const componentState = component.oc.state ? (
      <div class={`state component-state-${component.oc.state.toLowerCase()}`}>
        {component.oc.state}
      </div>
    ) : null;

    const isHidden =
      component.oc.state === 'deprecated' ||
      component.oc.state === 'experimental';

    const remoteServerColumns = isRemote
      ? [
          <div class="date">{component.oc.stringifiedDate || ''}</div>,
          <div class="activity">{component.allVersions.length}</div>
        ]
      : null;
    const sizeColumn = sizeAvailable ? (
      component.oc.files.template.size ? (
        <div>{Math.round(component.oc.files.template.size / 1024)} kb</div>
      ) : (
        <div>? Kb</div>
      )
    ) : null;

    return (
      <a href={`${component.name}/${component.version}/~info`}>
        <div
          id={`component-${component.name}`}
          class={`componentRow row table${isHidden ? ' hide' : ''}`}
        >
          <div class="title">
            <p class="name">{component.name}</p>
            <span class="description">{component.description}</span>
          </div>
          {componentState}
          <div class="author">{component.author.name || ''}</div>
          <div>{component.version}</div>
          {remoteServerColumns}
          {sizeColumn}
        </div>
      </a>
    );
  };

  return (
    <div id="components-list" class="box">
      <form id="filter-components">
        <div class="filters">
          <input
            class="search-filter"
            type="text"
            placeholder="Filter by component name"
          />
          <input
            class="author-filter"
            type="text"
            placeholder="Filter by component author"
          />
        </div>
        <div class="states">
          <span>Hide:</span>
          <SelectedCheckbox name="deprecated" stateCounts={props.stateCounts} />
          <SelectedCheckbox
            name="experimental"
            stateCounts={props.stateCounts}
          />
        </div>
      </form>
      <div class="row header componentRow table">
        <div class="title" />
        <div class="author">Author</div>
        <div>Latest version</div>
        {remoteServerColumns}
        {sizeColumn}
      </div>
      {props.components.map(componentRow)}
    </div>
  );
};

export default ComponentsList;
