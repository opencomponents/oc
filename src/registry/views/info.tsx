import type { Component, ComponentDetail } from '../../types';

import isTemplateLegacy from '../../utils/is-template-legacy';
import ComponentAuthor from './partials/component-author';
import ComponentParameters from './partials/component-parameters';
import getComponentState from './partials/component-state';
import ComponentVersions from './partials/component-versions';
import Layout from './partials/layout';
import infoJS from './static/info';

export interface Vm {
  parsedAuthor: { name?: string; email?: string; url?: string };
  component: Component;
  componentDetail?: ComponentDetail;
  dependencies: string[];
  href: string;
  sandBoxDefaultQs: string;
  title: string;
  theme: 'light' | 'dark';
  repositoryUrl: string | null;
}

function formatDate(date: Date | string) {
  if (typeof date === 'string') return date;

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }).format(date);
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
      borderWidth: 2,
      borderColor: "#6366f1",
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      pointBackgroundColor: "#ffffff",
      pointBorderColor: "#6366f1",
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: "#ffffff",
      pointHoverBorderColor: "#8b5cf6",
      pointHoverBorderWidth: 3,
      fill: true,
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [dataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                size: 14,
                weight: '500'
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 15, 35, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#a1a1aa',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
            cornerRadius: 12,
            displayColors: false,
            titleFont: {
              family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              size: 14,
              weight: '600'
            },
            bodyFont: {
              family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              size: 13
            },
            callbacks: {
              title: function(context) {
                return 'Size: ' + context[0].parsed.y + ' KB';
              },
              footer: function(items) {
                const version = items[0].raw.version;
                return 'Version: ' + version;
              }
            }
          }
        },
        scales: {
          x: {
            type: "time",
            time: {
              unit: "month",
              displayFormats: {
                month: 'MMM yyyy'
              }
            },
            display: true,
            title: {
              display: true,
              text: 'Release Date',
              color: '#a1a1aa',
              font: {
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                size: 14,
                weight: '500'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#a1a1aa',
              font: {
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                size: 12
              },
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            display: true,
            title: {
              display: true,
              text: 'Size (KB)',
              color: '#a1a1aa',
              font: {
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                size: 14,
                weight: '500'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#a1a1aa',
              font: {
                family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                size: 12
              },
              stepSize: 50
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
    <Layout scripts={scripts} href={href} title={vm.title} theme={vm.theme}>
      <section class="hero">
        <nav class="breadcrumb">
          <a href={href}>← All components</a>
        </nav>
        <h1 class="component-title" safe>
          {component.name}
        </h1>

        <div class="version-selector">
          <span class="version-label">Version:</span>
          <ComponentVersions
            versions={component.allVersions}
            selectedVersion={component.version}
          />
        </div>

        <p safe class="component-description">
          {component.description}
        </p>

        <output
          class="stats-badge"
          aria-label={`Component statistics: Latest release on ${formatDate(
            publishDate
          )}`}
        >
          <div class="chart-icon" aria-hidden="true">
            <div class="chart-bar"></div>
            <div class="chart-bar"></div>
            <div class="chart-bar"></div>
          </div>
          <div class="badge-text" safe>
            Latest Release: {formatDate(publishDate)}
            {componentState()}
          </div>
        </output>
      </section>

      <div class="main-content">
        <div class="primary-content">
          {statsAvailable ? (
            <section class="content-section collapsible-section">
              <div
                class="section-header collapsible-header"
                data-target="stats-content"
              >
                <div class="section-icon">📈</div>
                <h2 class="section-title">Package Size History</h2>
                <button
                  type="button"
                  class="collapse-toggle"
                  aria-label="Toggle package size history section"
                >
                  <span class="collapse-icon">▼</span>
                </button>
              </div>
              <div
                class="section-content collapsible-content"
                id="stats-content"
              >
                <div
                  class="chart-container"
                  style="position: relative; height: 300px; margin-bottom: 2rem;"
                >
                  <canvas id="stats" width="400" height="200" />
                </div>
              </div>
            </section>
          ) : (
            ''
          )}

          <ComponentParameters
            parameters={component.oc.parameters}
            currentValues={Object.fromEntries(
              Object.entries(component.oc.parameters || {})
                .filter(([, param]) => {
                  return (
                    param.default !== undefined || param.example !== undefined
                  );
                })
                .map(([paramName, param]) => {
                  const value =
                    param.default !== undefined
                      ? String(param.default)
                      : String(param.example);
                  return [paramName, value];
                })
            )}
          />

          <section class="url-section">
            <div class="content-section">
              <div class="section-header">
                <div class="section-icon">🔗</div>
                <h2 class="section-title">Component URL</h2>
              </div>
              <div class="section-content">
                <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">
                  You can edit the following area and then refresh or hit Enter
                  to apply the change into the preview window.
                </p>
                <input
                  class="w-100"
                  id="href"
                  type="text"
                  placeholder="Insert component href here"
                  value={componentHref}
                  style="width: 100%; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.875rem; padding: 1rem 1.5rem; border-radius: 12px;"
                />
                <div class="field" style="margin-top: 1rem;">
                  <p>Accept-Language header:</p>
                  <input
                    class="w-100"
                    id="lang"
                    type="text"
                    value="*"
                    readonly
                  />
                </div>
              </div>
            </div>
          </section>

          <section class="preview-section">
            <div class="preview-controls">
              <h2 class="section-title">Live Preview</h2>
              <div class="preview-buttons">
                <button type="submit" class="btn btn-primary refresh-preview">
                  🔄 Refresh
                </button>
                <button type="submit" class="btn btn-secondary open-preview">
                  🚀 Open in New Tab
                </button>
              </div>
            </div>
            <iframe
              class="preview-iframe"
              src={`~preview/${sandBoxDefaultQs}`}
              title="Component Preview"
              style="width: 100%; height: 500px; border: none; background: white;"
            />
          </section>
        </div>

        <aside class="sidebar">
          <div class="info-card">
            <h3 class="section-title" style="margin-bottom: 1.5rem;">
              📋 Component Info
            </h3>
            <div class="info-item">
              <span class="info-label">Author</span>
              <span class="info-value">
                <ComponentAuthor
                  name={vm.parsedAuthor.name}
                  email={vm.parsedAuthor.email}
                  url={vm.parsedAuthor.url}
                />
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Template</span>
              <span safe class="info-value">
                {template}
              </span>
            </div>
            {component.oc.files.template.size ? (
              <div class="info-item">
                <span class="info-label">Size</span>
                <span class="info-value">
                  {Math.round(component.oc.files.template.size / 1024)} KB
                </span>
              </div>
            ) : (
              ''
            )}
            <div class="info-item">
              <span class="info-label">Published</span>
              <span safe class="info-value">
                {formatDate(publishDate)}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Publish Agent</span>
              <span safe class="info-value">
                {publishAgent}
              </span>
            </div>
          </div>

          {repositoryUrl ? (
            <div class="info-card">
              <h3 class="section-title" style="margin-bottom: 1.5rem;">
                🔗 Links
              </h3>
              <div class="info-item">
                <span class="info-label">Repository</span>
                <span class="info-value">
                  <a href={repositoryUrl}>View Source</a>
                </span>
              </div>
            </div>
          ) : (
            ''
          )}

          <div class="info-card">
            <h3 class="section-title" style="margin-bottom: 1.5rem;">
              📦 Dependencies
            </h3>
            <div class="info-item">
              <span class="info-label">Node.js</span>
              <span class="info-value">
                {dependencies && dependencies.length > 0
                  ? dependencies.join(', ')
                  : 'None'}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Plugins</span>
              <span class="info-value">
                {component.oc.plugins && component.oc.plugins.length > 0
                  ? component.oc.plugins.join(', ')
                  : 'None'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
