import type { VM } from '../../../types';

type State = keyof VM['stateCounts'];

const SelectedCheckbox = (props: {
  stateCounts: VM['stateCounts'];
  name: State;
}) => {
  const getCount = (state: State) => props.stateCounts[state] || 0;

  return (
    <>
      <input type="checkbox" name={props.name} checked />
      <div class="state">
        <span class={`component-state-${props.name}`}>
          {props.name} ({getCount(props.name)})
        </span>
      </div>
    </>
  );
};

export default SelectedCheckbox;
