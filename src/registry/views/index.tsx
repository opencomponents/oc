import type { VM } from '../../types';
import Dependencies from './partials/components-dependencies';
import History from './partials/components-history';
import List from './partials/components-list';
import Plugins from './partials/components-plugins';
import Templates from './partials/components-templates';
import Layout from './partials/layout';
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
    <Layout scripts={scripts} href={vm.href} title={vm.title} theme={vm.theme}>
      <section class="hero">
        <h1>OpenComponents Registry</h1>

        <output
          class="stats-badge"
          aria-label={`Registry statistics: ${
            vm.components.length
          } total components, ${getCount(
            'experimental'
          )} experimental, ${getCount('deprecated')} deprecated`}
        >
          <span aria-hidden="true">📦</span>
          {vm.components.length} Components ({getCount('experimental')}{' '}
          experimental, {getCount('deprecated')} deprecated)
        </output>
      </section>

      <div class="main-content">
        <div class="primary-content">
          <nav id="menuList" style="margin-bottom: 2rem;">
            <a href="#components-list" class="tab-link selected">
              Components
            </a>
            {!isLocal ? (
              <>
                <a href="#components-history" class="tab-link">
                  History
                </a>
                <a href="#components-templates" class="tab-link">
                  Templates
                </a>
                <a href="#components-dependencies" class="tab-link">
                  Dependencies
                </a>
                <a href="#components-plugins" class="tab-link">
                  Plugins
                </a>
              </>
            ) : (
              ''
            )}
          </nav>

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
              Object.entries(vm.availablePlugins).map(
                ([name, { description }]) => [name, description]
              )
            )}
          />
        </div>

        <aside class="sidebar">
          <div class="info-card">
            <h3 class="section-title" style="margin-bottom: 1.5rem;">
              📋 Registry Info
            </h3>
            <div class="info-item">
              <span class="info-label">Base URL</span>
              <span class="info-value">
                <a safe href={vm.href}>
                  {vm.href}
                </a>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Version</span>
              <span safe class="info-value">
                {vm.ocVersion}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Type</span>
              <span class="info-value">
                {isLocal ? 'Local dev registry' : 'On-line registry'}
              </span>
            </div>
            {!isLocal ? (
              <div class="info-item">
                <span class="info-label">Releases</span>
                <span class="info-value">{vm.componentsReleases}</span>
              </div>
            ) : (
              ''
            )}
          </div>
        </aside>
      </div>
    </Layout>
  );
}
