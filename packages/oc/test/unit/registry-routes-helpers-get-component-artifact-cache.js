const expect = require('chai').expect;
const sinon = require('sinon');

const GetComponent =
  require('../../dist/registry/routes/helpers/get-component').default;

const TEMPLATE_HASH = 'registry-artifact-cache-template';

const makeArtifacts = (label) => ({
  component: {
    name: 'registry-artifact-cache-component',
    version: '1.0.0',
    oc: {
      container: false,
      renderInfo: false,
      files: {
        template: {
          type: 'jade',
          hashKey: TEMPLATE_HASH,
          src: 'template.js'
        },
        dataProvider: {
          type: 'node.js',
          hashKey: 'registry-artifact-cache-provider',
          src: 'server.js'
        },
        env: '.env'
      }
    }
  },
  provider: `"use strict";module.exports.data=function(ctx,cb){cb(null,{provider:${JSON.stringify(
    `provider-${label}`
  )},env:ctx.env.registry});};`,
  template: `var oc=oc||{};oc.components=oc.components||{};oc.components[${JSON.stringify(
    TEMPLATE_HASH
  )}]=function(data){return "<div>template-${label}:"+data.provider+":"+data.env+"</div>";};`
});

const makeRepository = (label) => {
  const artifacts = makeArtifacts(label);
  const jade = require('oc-template-jade');
  return {
    getCompiledView: sinon.stub().resolves(artifacts.template),
    getComponent: sinon.stub().resolves(artifacts.component),
    getEnv: sinon.stub().resolves({ registry: label }),
    getDataProvider: sinon.stub().resolves({
      content: artifacts.provider,
      filePath: `/${label}/server.js`
    }),
    getTemplatesInfo: sinon
      .stub()
      .returns([{ type: 'oc-template-jade', version: '7.0.6', externals: [] }]),
    getTemplate: sinon.stub().callsFake((type) =>
      type === 'jade' || type === 'oc-template-jade' ? jade : undefined
    ),
    getStaticFilePath: sinon.stub().returns('//cdn.invalid/files/')
  };
};

const render = (renderer, conf = {}) =>
  new Promise((resolve) => {
    renderer(
      {
        name: 'registry-artifact-cache-component',
        headers: {},
        parameters: {},
        version: '1.0.0',
        conf: {
          baseUrl: 'http://components.invalid/',
          dependencies: [],
          plugins: {},
          ...conf
        }
      },
      resolve
    );
  });

describe('registry : routes : helpers : get-component : artifact cache', () => {
  it('isolates env, provider, and template artifacts between registries', async () => {
    const firstRepository = makeRepository('first');
    const secondRepository = makeRepository('second');
    const first = GetComponent(
      { plugins: {}, templates: [] },
      firstRepository
    );
    const second = GetComponent(
      { plugins: {}, templates: [] },
      secondRepository
    );

    const firstResult = await render(first);
    const secondResult = await render(second);

    expect(firstResult.status).to.equal(200);
    expect(firstResult.response.html).to.equal(
      '<div>template-first:provider-first:first</div>'
    );
    expect(secondResult.status).to.equal(200);
    expect(secondResult.response.html).to.equal(
      '<div>template-second:provider-second:second</div>'
    );
    for (const repository of [firstRepository, secondRepository]) {
      expect(repository.getEnv.calledOnce).to.equal(true);
      expect(repository.getDataProvider.calledOnce).to.equal(true);
      expect(repository.getCompiledView.calledOnce).to.equal(true);
    }
  });

  it('removes a rejected single-flight load so a retry executes again', async () => {
    const repository = makeRepository('retry');
    const artifacts = makeArtifacts('retry');
    repository.getDataProvider.onFirstCall().callsFake(
      () =>
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('temporary failure')), 5);
        })
    );
    repository.getDataProvider.onSecondCall().resolves({
      content: artifacts.provider,
      filePath: '/retry/server.js'
    });
    const renderer = GetComponent(
      { plugins: {}, templates: [] },
      repository
    );

    const failed = await Promise.all([render(renderer), render(renderer)]);
    expect(failed.map((result) => result.status)).to.deep.equal([502, 502]);
    expect(repository.getDataProvider.calledOnce).to.equal(true);

    const retried = await render(renderer);
    expect(retried.status).to.equal(200);
    expect(retried.response.html).to.equal(
      '<div>template-retry:provider-retry:retry</div>'
    );
    expect(repository.getDataProvider.calledTwice).to.equal(true);
  });

  it('reloads providers and templates but preserves env caching in hot reload', async () => {
    const repository = makeRepository('hot');
    const renderer = GetComponent(
      { plugins: {}, templates: [] },
      repository
    );

    await render(renderer, { hotReloading: true });
    await render(renderer, { hotReloading: true });

    expect(repository.getEnv.calledOnce).to.equal(true);
    expect(repository.getDataProvider.calledTwice).to.equal(true);
    expect(repository.getCompiledView.calledTwice).to.equal(true);
  });
});
