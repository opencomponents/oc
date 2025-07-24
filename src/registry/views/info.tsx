import type { Component, ComponentDetail } from '../../types';

import isTemplateLegacy from '../../utils/is-template-legacy';
import ComponentAuthor from './partials/component-author';
import ComponentParameters from './partials/component-parameters';
import getComponentState from './partials/component-state';
import ComponentVersions from './partials/component-versions';
import Layout from './partials/layout';
import Property from './partials/property';
import infoJS from './static/info';

interface Vm {
  parsedAuthor: { name?: string; email?: string; url?: string };
  component: Component;
  componentDetail?: ComponentDetail;
  dependencies: string[];
  href: string;
  sandBoxDefaultQs: string;
  title: string;
  repositoryUrl: string | null;
}

function statsJs(name: string, componentDetail: ComponentDetail) {
  return `
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  <script>
  (function () {
    const componentDetail = ${JSON.stringify(componentDetail)};
    const ctx = document.getElementById('stats');
    const dataPoints = [];
    const versionNumbers = Object.keys(componentDetail);
  
    for (const versionNumber of versionNumbers) {
      const versionData = componentDetail[versionNumber];
      const date = new Date(versionData.publishDate);
      const size = Math.round(versionData.templateSize / 1024);
  
      // Add the data point to the array
      dataPoints.push({ x: date, y: size, version: versionNumber });
    }
  
    const dataset = {
      label: "${name}",
      data: dataPoints,
      tension: 0.1,
      borderWidth: 1,
      backgroundColor: "#fbbf24",
    }
  
    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [dataset]
      },
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              footer(items) {
                const version = items[0].raw.version;
                return 'Version: ' + version;
              }
            }
          }
        },
        title: {
          display: true,
          text: "Package Sizes Over Time",
        },
        scales: {
          x: {
            type: "time",
            time: {
              unit: "day",
            },
            display: true,
            title: {
              display: true,
              text: 'Date published'
            }
          },
          y: {
            beginAtZero: true,
            display: true,
            title: {
              display: true,
              text: 'Size in KB'
            }
          },
        },
      }
    });
    }());
  </script>
  `;
}

export default function Info(vm: Vm) {
  const componentState = getComponentState(vm);

  const ShowArray = (props: { title: string; arr?: string[] }) => (
    <Property
      display={props.title}
      value={
        !!props.arr && props.arr.length > 0 ? props.arr.join(', ') : 'none'
      }
    />
  );

  const { component, dependencies, href, repositoryUrl, sandBoxDefaultQs } = vm;

  const componentHref = `${href}${component.name}/${component.version}/${sandBoxDefaultQs}`;

  const publishDate = component.oc.date
    ? new Date(component.oc.date)
    : 'not available';

  const publishAgent = component.oc.version
    ? `OC CLI ${component.oc.version}`
    : 'not available';

  const templateType = component.oc.files.template.type;
  const compiler = `${templateType}-compiler`;
  const template = `${templateType} (${
    isTemplateLegacy(templateType)
      ? 'legacy'
      : compiler + '@' + component.oc.files.template.version
  })`;
  const statsAvailable =
    !!vm.componentDetail && Object.keys(vm.componentDetail).length > 1;

  const scripts = `
  <script>var thisComponentHref="${href}${component.name}/";
    ${infoJS}
  </script>
  ${statsAvailable ? statsJs(vm.component.name, vm.componentDetail!) : ''}
  `;

  return (
    <Layout scripts={scripts} href={href} title={vm.title}>
      <a class="back" href={href}>
        &lt;&lt; All components
      </a>
      <h2>
        {component.name} &nbsp;
        <ComponentVersions
          versions={component.allVersions}
          selectedVersion={component.version}
        />
      </h2>
      <p class="w-100">
        {component.description} {componentState()}
      </p>
      {statsAvailable ? (
        <>
          <h3>Stats</h3>
          <canvas id="stats" width="400" height="200" />
        </>
      ) : (
        ''
      )}
      <h3>Component Info</h3>
      <Property
        display="Repository"
        value={repositoryUrl || 'not available'}
        linked={!!repositoryUrl}
      />
      <ComponentAuthor
        name={vm.parsedAuthor.name}
        email={vm.parsedAuthor.email}
        url={vm.parsedAuthor.url}
      />
      <Property display="Publish date" value={publishDate} />
      <Property display="Publish agent" value={publishAgent} />
      <Property display="Template" value={template} />
      <ShowArray title="Node.js dependencies" arr={dependencies} />
      <ShowArray title="Plugin dependencies" arr={component.oc.plugins} />
      {component.oc.files.template.size ? (
        <Property
          display="Template size"
          value={`${Math.round(component.oc.files.template.size / 1024)} kb`}
        />
      ) : (
        ''
      )}
      <ComponentParameters parameters={component.oc.parameters} />
      <h3>Code</h3>
      <p>
        You can edit the following area and then
        <a href="#refresh" class="refresh-preview">
          {' '}
          refresh{' '}
        </a>
        to apply the change into the preview window.
      </p>
      <div class="field">
        <p>Component's href:</p>
      </div>
      <textarea
        class="w-100"
        id="href"
        placeholder="Insert component href here"
        readonly
      >
        {componentHref}
      </textarea>
      <div class="field">
        <p>Accept-Language header:</p>
      </div>
      <input class="w-100" id="lang" type="text" value="*" readonly />
      <h3>
        Preview {'( '}
        <a class="refresh-preview" href="#refresh">
          Refresh
        </a>
        {' | '}
        <a class="open-preview" href="#open">
          Open
        </a>
        {' )'}
      </h3>
      <iframe
        class="preview"
        src={`~preview/${sandBoxDefaultQs}`}
        title="Component Preview"
      />
    </Layout>
  );
}
