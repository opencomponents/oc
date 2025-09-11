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

  const componentRow = (component: ParsedComponent) => {
    const isHidden =
      component.oc.state === 'deprecated' ||
      component.oc.state === 'experimental';

    return (
      <a href={`${component.name}/${component.version}/~info`}>
        <div
          id={`component-${component.name}`}
          class={`componentRow row table${isHidden ? ' hide' : ''}`}
        >
          <div class="title">
            <p class="name" safe>
              {component.name}
            </p>
            <span class="description" safe>
              {component.description}
            </span>
          </div>
          {component.oc.state && (
            <div
              class={`state component-state-${component.oc.state.toLowerCase()}`}
            >
              {component.oc.state}
            </div>
          )}
          <div class="author" safe>
            {component.author.name || ''}
          </div>
          <div safe>{component.version}</div>
          {isRemote && (
            <>
              <div class="date" safe>
                {component.oc.stringifiedDate || ''}
              </div>
              <div class="activity">{component.allVersions.length}</div>
            </>
          )}
          {sizeAvailable &&
            (component.oc.files.template.size ? (
              <div>
                {Math.round(component.oc.files.template.size / 1024)} kb
              </div>
            ) : (
              <div>? Kb</div>
            ))}
          {/* Mobile compact view - hidden on desktop */}
          <div class="mobile-compact">
            <div class="mobile-meta">
              <span class="mobile-author" safe>
                {component.author.name || ''}
              </span>
              <span class="mobile-version" safe>
                {component.version}
              </span>
              {isRemote && (
                <>
                  <span class="mobile-date" safe>
                    {component.oc.stringifiedDate || ''}
                  </span>
                  <span class="mobile-activity">
                    {component.allVersions.length}
                  </span>
                </>
              )}
              {sizeAvailable && (
                <span class="mobile-size">
                  {component.oc.files.template.size
                    ? `${Math.round(
                        component.oc.files.template.size / 1024
                      )} kb`
                    : '? Kb'}
                </span>
              )}
            </div>
          </div>
        </div>
      </a>
    );
  };

  return (
    <div id="components-list" class="box">
      <form id="filter-components">
        <div class="filters">
          <input
            id="search-filter"
            type="text"
            autofocus
            placeholder="Filter by component name"
          />
          <input
            id="author-filter"
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
        {isRemote && (
          <>
            <div class="date">Updated</div>
            <div class="activity">Activity</div>
          </>
        )}
        {sizeAvailable && <div>Size</div>}
      </div>
      {props.components.map(componentRow)}
    </div>
  );
};

export default ComponentsList;
