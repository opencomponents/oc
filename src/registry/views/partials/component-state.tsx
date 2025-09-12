import type { Component } from '../../../types';

const componentState =
  ({ component }: { component: Component }) =>
  () => {
    if (!component.oc.state) return null;
    return (
      <span
        class={`state-badge component-state-${component.oc.state.toLowerCase()}`}
      >
        {component.oc.state}
      </span>
    );
  };

export default componentState;
