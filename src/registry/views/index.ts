import dependencies from './partials/components-dependencies';
import list from './partials/components-list';
import plugins from './partials/components-plugins';
import templates from './partials/components-templates';
import indexJS from './static/index';

import type { VM } from '../../types';
import getLayout from './partials/layout';
import getProperty from './partials/property';

export default function indexView(vm: VM): string {
  const tabs = {
    dependencies: dependencies(vm),
    history: '', // Will be rendered client-side
    list: list(vm),
    templates: templates(vm),
    plugins: plugins(vm)
  };

  const layout = getLayout(vm);
  const property = getProperty();

  const getCount = (state: 'deprecated' | 'experimental') =>
    vm.stateCounts[state] || 0;
  const isLocal = vm.type !== 'oc-registry';

  const componentsValue = `${vm.components.length} (${getCount(
    'experimental'
  )} experimental, ${getCount('deprecated')} deprecated)`;

  const extraLinks =
    ` | <a href="#components-history" class="tab-link">History</a>` +
    ` | <a href="#components-templates" class="tab-link">Available templates</a>` +
    ` | <a href="#components-dependencies" class="tab-link">Available dependencies</a>` +
    ` | <a href="#components-plugins" class="tab-link">Available plugins</a>`;

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
    <div id="components-history" class="box" style="display:none"></div>
    ${tabs.templates}
    ${tabs.dependencies}
    ${tabs.plugins}`;

  const scripts = `<script>
    var q = "${encodeURIComponent(vm.q)}", componentsList = ${JSON.stringify(
      vm.componentsList
    )}, historyList = ${JSON.stringify(vm.componentsHistory || [])};
${indexJS}</script>`;

  return layout({ content, scripts });
}
