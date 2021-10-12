import { Component } from '../../../types';

const componentState =
  ({ component }: { component: Component }) =>
  (): string =>
    !component.oc.state
      ? ''
      : `<span class="details-state">
     <span class="component-state-${component.oc.state.toLowerCase()}">
       ${component.oc.state}
     </span>
   </span>`;

export default componentState;
