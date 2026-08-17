const expect = require('chai').expect;
const sinon = require('sinon');

const { create } = require('../../dist/registry/router');
const mockedComponents = require('../fixtures/mocked-components');

const waitFor = (value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), 10));

const makeResponse = (conf, resolve) => ({
  conf,
  set: sinon.stub(),
  cookie: sinon.stub(),
  status: (status) => ({
    json: (body) => resolve({ status, body })
  })
});

describe('registry : router : artifact cache', () => {
  it('shares cold artifact loads between GET and batch routes', async () => {
    const fixture = mockedComponents['env-component'];
    const jade = require('oc-template-jade');
    const repository = {
      getCompiledView: sinon.stub().callsFake(() => waitFor(fixture.view)),
      getComponent: sinon.stub().resolves(fixture.package),
      getEnv: sinon.stub().callsFake(() => waitFor({ secret: 'secretvalue' })),
      getDataProvider: sinon.stub().callsFake(() =>
        waitFor({ content: fixture.data, filePath: '/path/to/server.js' })
      ),
      getTemplatesInfo: sinon
        .stub()
        .returns([{ type: 'oc-template-jade', version: '7.0.6', externals: [] }]),
      getTemplate: sinon.stub().callsFake((type) =>
        type === 'jade' || type === 'oc-template-jade' ? jade : undefined
      ),
      getStaticFilePath: sinon.stub().returns('//cdn.invalid/files/')
    };
    const handlers = new Map();
    const adapter = {
      route: sinon
        .stub()
        .callsFake((_method, _path, id, routeHandlers) => {
          handlers.set(id, routeHandlers.at(-1));
        }),
      fromConnect: sinon.stub().callsFake((handler) => handler)
    };
    const conf = {
      baseUrl: 'http://components.invalid/',
      customHeadersToSkipOnWeakVersion: [],
      dataProvider: { enabled: true },
      dependencies: [],
      discovery: { api: true, ui: true, validate: false },
      env: {},
      local: true,
      plugins: {},
      prefix: '/',
      templates: []
    };
    create(adapter, conf, repository);

    const getResult = new Promise((resolve) => {
      handlers.get('component-version')(
        {
          body: {},
          headers: {},
          ip: '127.0.0.1',
          method: 'GET',
          params: {
            componentName: 'env-component',
            componentVersion: '1.0.0'
          },
          query: {}
        },
        makeResponse(conf, resolve)
      );
    });
    const batchResult = new Promise((resolve) => {
      handlers.get('components')(
        {
          body: {
            components: [
              {
                name: 'env-component',
                parameters: {},
                version: '1.0.0'
              }
            ]
          },
          headers: {},
          ip: '127.0.0.1'
        },
        makeResponse(conf, resolve)
      );
    });

    const results = await Promise.all([getResult, batchResult]);
    expect(results.map((result) => result.status)).to.deep.equal([200, 200]);
    expect(repository.getEnv.calledOnce).to.equal(true);
    expect(repository.getDataProvider.calledOnce).to.equal(true);
    expect(repository.getCompiledView.calledOnce).to.equal(true);
  });
});
