module.exports = vm => {
  const pluginRow = name => `<div class="componentRow row table">
    <p class="release">
      ${name}
    </p>
  </div>
`;

  const pluginNames = Object.keys(vm.availablePlugins);

  return `<div id="components-plugins" class="box">${
    pluginNames.length
      ? pluginNames.map(pluginRow).join('')
      : 'No plugins registered'
  }</div>`;
};
