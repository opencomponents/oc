const expect = require('chai').expect;
const sinon = require('sinon');

const ComponentRoute = require('../../dist/registry/routes/component').default;
const ComponentInfoRoute =
  require('../../dist/registry/routes/component-info').default;
const ComponentPreviewRoute =
  require('../../dist/registry/routes/component-preview').default;
const IndexRoute = require('../../dist/registry/routes/index').default;
const mockedComponents = require('../fixtures/mocked-components');

describe('registry : routes : component info mutation isolation', () => {
  const recursivelyFreeze = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      for (const nested of Object.values(value)) recursivelyFreeze(nested);
      Object.freeze(value);
    }
    return value;
  };

  const componentInfo = () =>
    recursivelyFreeze({
      name: 'hello-world',
      version: '1.0.0',
      allVersions: ['1.0.0'],
      author: 'Jane Doe <jane@example.com>',
      dependencies: { lodash: '^4.0.0' },
      description: 'A component',
      keywords: ['example'],
      oc: {
        container: false,
        date: 123,
        files: {
          template: {
            hashKey: 'template-key',
            src: 'template.js',
            type: 'oc-template-es6',
            version: '1.0.0'
          },
          static: ['public/example.txt']
        },
        packaged: true,
        parameters: {
          greeting: {
            default: 'hello',
            example: 'hi',
            mandatory: false,
            type: 'string'
          }
        },
        plugins: [],
        state: 'experimental',
        version: '0.50.61'
      }
    });

  it('renders the index view from recursively frozen component info', async () => {
    const component = componentInfo();
    const before = JSON.stringify(component);
    const send = sinon.stub();
    const repository = {
      getComponent: sinon.stub().resolves(component),
      getComponents: sinon.stub().resolves(['hello-world']),
      getTemplatesInfo: sinon.stub().returns([])
    };
    const route = IndexRoute(repository);

    await route(
      { cookies: {}, headers: { accept: 'text/html' }, query: {} },
      {
        conf: {
          baseUrl: 'http://registry.test/',
          dependencies: [],
          discovery: { api: true, experimental: true, ui: true },
          local: false,
          plugins: {}
        },
        send
      }
    );

    expect(send.calledOnce).to.be.true;
    expect(send.args[0][0]).to.contain('hello-world');
    expect(JSON.stringify(component)).to.equal(before);
    expect(component.author).to.equal('Jane Doe <jane@example.com>');
    expect(component.oc.stringifiedDate).to.equal(undefined);
  });

  it('returns unchanged component-info JSON without attaching requestVersion', async () => {
    const component = componentInfo();
    let response;
    const repository = {
      getComponent: sinon.stub().resolves(component),
      getComponentsDetails: sinon.stub().resolves(undefined)
    };
    const route = ComponentInfoRoute({}, repository);

    await route(
      {
        headers: { accept: 'application/json' },
        params: { componentName: 'hello-world', componentVersion: '^1.0.0' }
      },
      {
        conf: { discovery: { api: true, ui: true } },
        status: (status) => ({
          json: (body) => {
            response = { body, status };
          }
        })
      }
    );

    expect(response.status).to.equal(200);
    expect(response.body).to.eql({
      ...component,
      requestVersion: '^1.0.0'
    });
    expect(response.body.oc).to.equal(component.oc);
    expect(component.requestVersion).to.equal(undefined);
  });

  it('returns unchanged preview JSON without attaching requestVersion', async () => {
    const component = componentInfo();
    const repository = {
      getComponent: sinon.stub().resolves(component),
      getTemplatesInfo: sinon.stub().returns([])
    };
    const route = ComponentPreviewRoute({}, repository);
    const response = await new Promise((resolve) => {
      route(
        {
          headers: { accept: 'application/json' },
          params: { componentName: 'hello-world', componentVersion: '^1.0.0' },
          query: {}
        },
        {
          conf: {},
          status: (status) => ({
            json: (body) => resolve({ body, status })
          })
        }
      );
    });

    expect(response.status).to.equal(200);
    expect(response.body).to.eql({
      ...component,
      requestVersion: '^1.0.0'
    });
    expect(response.body.oc).to.equal(component.oc);
    expect(component.requestVersion).to.equal(undefined);
  });

  it('renders a component while its repository component info is recursively frozen', async () => {
    const fixture = mockedComponents['simple-component'];
    const component = recursivelyFreeze(
      JSON.parse(JSON.stringify(fixture.package))
    );
    const templates = {
      'oc-template-handlebars': require('oc-template-handlebars'),
      'oc-template-jade': require('oc-template-jade')
    };
    const repository = {
      getCompiledView: sinon.stub().resolves(fixture.view),
      getComponent: sinon.stub().resolves(component),
      getDataProvider: sinon
        .stub()
        .resolves({ content: fixture.data, filePath: '/tmp/server.js' }),
      getStaticFilePath: sinon.stub().returns('//cdn.test/files/'),
      getTemplate: (type) => templates[type],
      getTemplatesInfo: sinon.stub().returns([])
    };
    const route = ComponentRoute({}, repository);
    const response = await new Promise((resolve) => {
      route(
        {
          headers: {},
          ip: '127.0.0.1',
          method: 'GET',
          params: {
            componentName: 'simple-component',
            componentVersion: '1.0.0'
          },
          query: {}
        },
        {
          conf: { baseUrl: 'http://registry.test/' },
          set: sinon.stub(),
          status: (status) => ({
            json: (body) => resolve({ body, status })
          })
        }
      );
    });

    expect(response.status).to.equal(200);
    expect(response.body.html).to.equal('<div>hello</div>');
    expect(Object.isFrozen(component.oc.files)).to.be.true;
    expect(Object.isFrozen(component.oc.parameters)).to.be.true;
  });
});
