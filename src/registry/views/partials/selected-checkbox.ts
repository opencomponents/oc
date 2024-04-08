import type { VM } from '../../../types';

type State = keyof VM['stateCounts'];

const selectedCheckbox =
  (vm: VM) =>
  (name: State): string => {
    const getCount = (state: State) => vm.stateCounts[state] || 0;

    return `<input type="checkbox" name="${name}" checked />
<div class="state">
  <span class="component-state-${name}">${name} (${getCount(name)})</span>
</div>`;
  };

export default selectedCheckbox;
