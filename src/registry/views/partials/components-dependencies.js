module.exports = vm => {
  const dependencyRow = ({ core, link, name, version }) => {
    const label = name + (core ? ` (node.js core dependency)` : `@${version}`);
    return `<a href="${link}" target="_blank">
  <div class="componentRow row table">
    <p class="release">${label}</p>
  </div>
</a>`;
  };

  return `<div id="components-dependencies" class="box">${vm.availableDependencies
    .map(dependencyRow)
    .join('')}</div>`;
};
