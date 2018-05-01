module.exports = vm => name => {
  const getCount = state => vm.stateCounts[state] || 0;
  return `<input type="checkbox" name="${name}" checked />
<div class="state">
  <span class="component-state-${name}">${name} (${getCount(name)})</span>
</div>`;
};
