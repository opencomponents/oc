import type { VM } from '../../types';
import Dependencies from './partials/components-dependencies';
import History from './partials/components-history';
import List from './partials/components-list';
import Plugins from './partials/components-plugins';
import Templates from './partials/components-templates';
import Layout from './partials/layout';
import Property from './partials/property';
import indexJS from './static/index';

export default function indexView(vm: VM) {
  const getCount = (state: 'deprecated' | 'experimental') =>
    vm.stateCounts[state] || 0;
  const isLocal = vm.type !== 'oc-registry';

  const scripts = `<script>
    var q = "${encodeURIComponent(vm.q)}", componentsList = ${JSON.stringify(
      vm.componentsList
    )};
${indexJS}</script>`;

  return (
    <Layout scripts={scripts} href={vm.href} title={vm.title}>
      <Property display="Base url" value={vm.href} linked={true} />
      <Property display="Version" value={vm.ocVersion} />
      <Property
        display="Components"
        value={`${vm.components.length} (${getCount(
          'experimental'
        )} experimental, ${getCount('deprecated')} deprecated)`}
      />
      {!isLocal ? (
        <Property display="Components releases" value={vm.componentsReleases} />
      ) : (
        ''
      )}
      <Property
        display="Registry type"
        value={isLocal ? 'Local dev registry' : 'On-line registry'}
      />
      <h2 id="menuList">
        <a href="#components-list" class="tab-link">
          Components
        </a>
        {!isLocal ? (
          <>
            {' | '}
            <a href="#components-history" class="tab-link">
              History
            </a>
            {' | '}
            <a href="#components-templates" class="tab-link">
              Available templates
            </a>
            {' | '}
            <a href="#components-dependencies" class="tab-link">
              Available dependencies
            </a>
            {' | '}
            <a href="#components-plugins" class="tab-link">
              Available plugins
            </a>
          </>
        ) : (
          ''
        )}
      </h2>
      <List
        type={vm.type}
        components={vm.components}
        stateCounts={vm.stateCounts}
      />
      <History />
      <Templates templates={vm.templates} />
      <Dependencies availableDependencies={vm.availableDependencies} />
      <Plugins
        availablePlugins={Object.fromEntries(
          Object.entries(vm.availablePlugins).map(([name, { description }]) => [
            name,
            description
          ])
        )}
      />
    </Layout>
  );
}
