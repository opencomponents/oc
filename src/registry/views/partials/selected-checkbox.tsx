import type { VM } from '../../../types';

type State = keyof VM['stateCounts'];

const SelectedCheckbox = (props: {
  stateCounts: VM['stateCounts'];
  name: State;
}) => {
  const getCount = (state: State) => props.stateCounts[state] || 0;

  return (
    <label class="checkbox-wrapper">
      <input type="checkbox" name={props.name} checked class="checkbox-input" />
      <div class="checkbox-custom">
        <svg
          class="checkbox-icon"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <title>Checkmark</title>
          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
        </svg>
      </div>
      <span class={`state-badge component-state-${props.name}`}>
        {props.name} ({getCount(props.name)})
      </span>
    </label>
  );
};

export default SelectedCheckbox;
