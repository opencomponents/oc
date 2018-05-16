module.exports = vm => {
  const tabs = {
    dependencies: require('./partials/components-dependencies')(vm),
    history: require('./partials/components-history')(vm),
    list: require('./partials/components-list')(vm),
    templates: require('./partials/components-templates')(vm)
  };

  const indexJS = require('./static/index');
  const layout = require('./partials/layout')(vm);
  const property = require('./partials/property')(vm);

  const getCount = state => vm.stateCounts[state] || 0;
  const isLocal = vm.type !== 'oc-registry';

  const componentsValue = `${vm.components.length} (${getCount(
    'experimental'
  )} experimental, ${getCount('deprecated')} deprecated)`;

  const extraLinks =
    ` | <a href="#components-history" class="tab-link">History</a>` +
    ` | <a href="#components-templates" class="tab-link">Available templates</a>` +
    ` | <a href="#components-dependencies" class="tab-link">Available dependencies</a>`;

  const registryType = isLocal ? 'Local dev registry' : 'On-line registry';

  const componentReleases = !isLocal
    ? property('Components releases', vm.componentsReleases)
    : '';

  const content = `${property('Base url', vm.href, true)}
    ${property('Version', vm.ocVersion)}
    ${property('Components', componentsValue)}
    ${componentReleases}
    ${property('Registry type', registryType)}
    <h2 id="menuList">
      <a href="#components-list" class="tab-link">Components</a>
      ${!isLocal ? extraLinks : ''}
    </h2>
    ${tabs.list}
    ${tabs.history}
    ${tabs.templates}
    ${tabs.dependencies}`;

  const scripts = `<script>
    var q = "${encodeURIComponent(vm.q)}", componentsList = ${JSON.stringify(
  vm.componentsList
)};
${indexJS}</script>`;

  return layout({ content, scripts });
};
