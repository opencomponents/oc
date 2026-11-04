const expect = require('chai').expect;
const injectr = require('injectr');

describe('registry : routes : component-info discoverability probe cache', () => {
  const baseComponent = () => ({
    name: 'hello-world',
    version: '1.0.0',
    allVersions: ['1.0.0'],
    author: 'Jane Doe <jane@example.com>',
    dependencies: { lodash: '^4.0.0' },
    description: 'A component',
    oc: {
      container: false,
      date: 123,
      files: {
        template: {
          hashKey: 'template-key',
          src: 'template.js',
          type: 'oc-template-es6',
          version: '1.0.0'
        }
      },
      packaged: true,
      parameters: {},
      plugins: [],
      state: 'experimental',
      version: '0.50.61'
    }
  });

  const loadRouteWithProbe = (requestStub) => {
    const helper = injectr(
      '../../dist/registry/routes/helpers/is-url-discoverable.js',
      { undici: { request: requestStub } },
      { process }
    );
    const route = injectr('../../dist/registry/routes/component-info.js', {
      './helpers/is-url-discoverable': {
        __esModule: true,
        default: helper.default
      }
    }).default;
    return { helper, route };
  };

  const renderInfoHtml = (route, { baseUrl, host }) =>
    new Promise((resolve, reject) => {
      const repository = {
        getComponent: () => Promise.resolve(baseComponent()),
        getComponentsDetails: () => Promise.resolve(undefined)
      };
      const handler = route({}, repository);
      handler(
        {
          cookies: {},
          headers: { accept: 'text/html', host },
          params: { componentName: 'hello-world', componentVersion: '1.0.0' }
        },
        {
          conf: {
            baseUrl,
            discovery: { api: true, ui: true },
            prefix: '/v2/',
            robots: false
          },
          send: (html) => resolve(html)
        }
      ).catch(reject);
    });

  it('issues ONE probe for repeated info renders with the same baseUrl', async () => {
    let probeCalls = 0;
    const { route } = loadRouteWithProbe(() => {
      probeCalls++;
      return Promise.resolve({
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    });

    const first = await renderInfoHtml(route, {
      baseUrl: 'https://registry-info.company.com/',
      host: 'registry-info.company.com'
    });
    const second = await renderInfoHtml(route, {
      baseUrl: 'https://registry-info.company.com/',
      host: 'registry-info.company.com'
    });

    expect(probeCalls).to.equal(1);
    expect(first).to.contain('https://registry-info.company.com/');
    expect(second).to.contain('https://registry-info.company.com/');
  });

  it('probes again for a different baseUrl', async () => {
    let probeCalls = 0;
    const { route } = loadRouteWithProbe(() => {
      probeCalls++;
      return Promise.resolve({
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    });

    await renderInfoHtml(route, {
      baseUrl: 'https://registry-a.company.com/',
      host: 'registry-a.company.com'
    });
    await renderInfoHtml(route, {
      baseUrl: 'https://registry-b.company.com/',
      host: 'registry-b.company.com'
    });

    expect(probeCalls).to.equal(2);
  });

  it('re-probes after clearDiscoverabilityCache(baseUrl)', async () => {
    let probeCalls = 0;
    const { helper, route } = loadRouteWithProbe(() => {
      probeCalls++;
      return Promise.resolve({
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    });
    const baseUrl = 'https://registry-clear.company.com/';

    await renderInfoHtml(route, { baseUrl, host: 'registry-clear.company.com' });
    expect(probeCalls).to.equal(1);
    helper.clearDiscoverabilityCache(baseUrl);
    await renderInfoHtml(route, { baseUrl, host: 'registry-clear.company.com' });
    expect(probeCalls).to.equal(2);
  });

  it('keeps the //host+prefix fallback when baseUrl is not discoverable', async () => {
    let probeCalls = 0;
    const { route } = loadRouteWithProbe(() => {
      probeCalls++;
      return Promise.resolve({
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    });

    const html = await renderInfoHtml(route, {
      baseUrl: 'https://undiscoverable.company.com/',
      host: 'info-host.test'
    });

    expect(probeCalls).to.equal(1);
    expect(html).to.contain('//info-host.test/v2/');
    expect(html).to.not.contain('https://undiscoverable.company.com/');
  });
});
