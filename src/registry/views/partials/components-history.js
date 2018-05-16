module.exports = vm => {
  const componentRow = ({ name, publishDate, version }) =>
    `<a href="${name}/${version}/~info">
  <div class="componentRow row table">
    <p class="release">${publishDate} - Published ${name}@${version}</p>
  </div>
</a>`;

  const history = vm.componentsHistory || [];

  return `<div id="components-history" class="box">${history
    .map(componentRow)
    .join('')}</div>`;
};
