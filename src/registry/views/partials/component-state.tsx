import type { Component } from '../../../types';

const componentState =
  ({ component }: { component: Component }) =>
  () => {
    if (!component.oc.state) return null;
    return (
      <span class="details-state">
        <span class={`component-state-${component.oc.state.toLowerCase()}`}>
          {component.oc.state}
        </span>
      </span>
    );
  };

export default componentState;
