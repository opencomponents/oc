const expect = require('chai').expect;
const sinon = require('sinon');

const IndexRoute = require('../../dist/registry/routes/index').default;
const {
  DiscoveryResponseCache,
  getDiscoveryCacheKey,
  getDiscoveryVariant
} = require('../../dist/registry/routes/discovery-cache');

describe('registry : routes : index discovery cache', () => {
  const makeComponent = (name, overrides = {}) => ({
    name,
    version: '1.0.0',
    allVersions: ['1.0.0'],
    author: 'Jane Doe <jane@example.com>',
    description: `${name} description`,
    keywords: ['example'],
    ...overrides,
    oc: {
      date: 1700000000000,
      files: {
        dataProvider: {
          hashKey: 'data-key',
          src: 'server.js',
          type: 'oc-template-handlebars'
        },
        static: [],
        template: {
          hashKey: 'template-key',
          src: 'template.js',
          type: 'oc-template-handlebars',
          version: '1.0.0'
        }
      },
      parameters: {},
      state: '',
      ...(overrides.oc || {})
    }
  });

  const baseConf = () => ({
    baseUrl: 'http://registry.test/',
    dependencies: [],
    discovery: {
      api: true,
      experimental: true,
      robots: true,
      ui: true,
      validate: false
    },
    local: false,
    plugins: {},
    pollingInterval: 5
  });

  const createRepository = ({ lastEdit = 100, components }) => {
    const store = new Map(Object.entries(components));
    return {
      getComponents: sinon.stub().resolves([...store.keys()]),
      getComponent: sinon.stub().callsFake(async (name) => {
        const component = store.get(name);
        if (!component) {
          throw new Error(`component not found: ${name}`);
        }
        return { ...component, allVersions: [...component.allVersions] };
      }),
      getComponentsDetails: sinon.stub().resolves({ lastEdit, components: {} }),
      getTemplatesInfo: sinon.stub().returns([])
    };
  };

  const setLastEdit = (repository, lastEdit) => {
    repository.getComponentsDetails.resolves({ lastEdit, components: {} });
  };

  const jsonRequest = ({ accept = 'application/json', query = {} } = {}) => ({
    cookies: {},
    headers: { accept },
    query
  });

  const htmlRequest = ({ cookies = {}, query = {} } = {}) => ({
    cookies,
    headers: { accept: 'text/html' },
    query
  });

  const createRes = (conf) => {
    const res = {
      conf,
      headers: {},
      statusCode: 0,
      body: undefined,
      set(field, value) {
        res.headers[field] = value;
        return res;
      },
      status(code) {
        res.statusCode = code;
        return res;
      },
      json(body) {
        res.body = body;
      },
      send(body) {
        res.body = body;
      }
    };
    return res;
  };

  describe('JSON discovery responses', () => {
    it('second identical GET / performs no further component fetches', async () => {
      const repository = createRepository({
        components: { 'hello-world': makeComponent('hello-world') }
      });
      const route = IndexRoute(repository);
      const conf = baseConf();

      const first = createRes(conf);
      await route(jsonRequest(), first);
      expect(first.statusCode).to.equal(200);
      expect(first.body.components).to.have.length(1);
      expect(repository.getComponents.callCount).to.equal(1);
      expect(repository.getComponent.callCount).to.equal(1);

      const second = createRes(conf);
      await route(jsonRequest(), second);
      expect(second.statusCode).to.equal(200);
      expect(second.body).to.eql(first.body);
      expect(repository.getComponents.callCount).to.equal(1);
      expect(repository.getComponent.callCount).to.equal(1);
      expect(repository.getTemplatesInfo.callCount).to.equal(0);
    });

    it('adds Cache-Control: public, max-age=<pollingInterval>', async () => {
      const repository = createRepository({
        components: { 'hello-world': makeComponent('hello-world') }
      });
      const route = IndexRoute(repository);

      const miss = createRes(baseConf());
      await route(jsonRequest(), miss);
      expect(miss.headers['Cache-Control']).to.equal('public, max-age=5');

      const hit = createRes(baseConf());
      await route(jsonRequest(), hit);
      expect(hit.headers['Cache-Control']).to.equal('public, max-age=5');
    });

    it('invalidates when lastEdit advances (publish/poll update)', async () => {
      const repository = createRepository({
        components: { 'hello-world': makeComponent('hello-world') }
      });
      const route = IndexRoute(repository);
      const conf = baseConf();

      const first = createRes(conf);
      await route(jsonRequest(), first);
      expect(first.body.components).to.have.length(1);

      // Simulate a publish: new component version published, poll observed it
      repository.getComponents.onSecondCall().resolves([
        'hello-world',
        'new-component'
      ]);
      repository.getComponent
        .withArgs('new-component', undefined)
        .resolves(makeComponent('new-component'));
      setLastEdit(repository, 200);

      const second = createRes(conf);
      await route(jsonRequest(), second);
      expect(second.body.components).to.have.length(2);
      expect(repository.getComponent.callCount).to.equal(3);

      // Steady state again: no further component fetches
      const third = createRes(conf);
      await route(jsonRequest(), third);
      expect(third.body).to.eql(second.body);
      expect(repository.getComponent.callCount).to.equal(3);
    });

    it('does not collide across query variants', async () => {
      const repository = createRepository({
        components: {
          'hello-world': makeComponent('hello-world'),
          'beta-widget': makeComponent('beta-widget', {
            oc: { date: 1700000000000, state: 'experimental' }
          })
        }
      });
      const route = IndexRoute(repository);
      const conf = baseConf();

      const plain = createRes(conf);
      await route(jsonRequest(), plain);
      expect(plain.body.components).to.have.length(2);

      const experimental = createRes(conf);
      await route(jsonRequest({ query: { state: 'experimental' } }), experimental);
      expect(experimental.body.components).to.have.length(1);
      expect(repository.getComponent.callCount).to.equal(4);

      // Repeats of each variant are served from cache
      await route(jsonRequest(), createRes(conf));
      await route(jsonRequest({ query: { state: 'experimental' } }), createRes(conf));
      expect(repository.getComponent.callCount).to.equal(4);

      // A meta variant is cached separately and does not disturb the others
      const meta = createRes(conf);
      await route(jsonRequest({ query: { meta: 'true' } }), meta);
      expect(meta.body.components[0]).to.have.property('publishDate');
      expect(repository.getComponent.callCount).to.equal(6);

      const plainAgain = createRes(conf);
      await route(jsonRequest(), plainAgain);
      expect(plainAgain.body).to.eql(plain.body);
      expect(repository.getComponent.callCount).to.equal(6);
    });

    it('falls back to uncached behaviour without getComponentsDetails (local/dev)', async () => {
      const repository = {
        getComponents: sinon.stub().resolves(['hello-world']),
        getComponent: sinon
          .stub()
          .resolves(makeComponent('hello-world')),
        getTemplatesInfo: sinon.stub().returns([])
      };
      const route = IndexRoute(repository);
      const conf = baseConf();

      const first = createRes(conf);
      await route(jsonRequest(), first);
      const second = createRes(conf);
      await route(jsonRequest(), second);

      expect(first.statusCode).to.equal(200);
      expect(second.body).to.eql(first.body);
      expect(repository.getComponent.callCount).to.equal(2);
      expect(second.headers['Cache-Control']).to.equal('public, max-age=5');
    });
  });

  describe('HTML discovery responses', () => {
    it('caches repeat HTML hits and varies by theme', async () => {
      const repository = createRepository({
        components: { 'hello-world': makeComponent('hello-world') }
      });
      const route = IndexRoute(repository);
      const conf = baseConf();

      const first = createRes(conf);
      await route(htmlRequest(), first);
      expect(first.body).to.contain('hello-world');
      expect(repository.getComponent.callCount).to.equal(1);

      const second = createRes(conf);
      await route(htmlRequest(), second);
      expect(second.body).to.equal(first.body);
      expect(repository.getComponent.callCount).to.equal(1);

      const light = createRes(conf);
      await route(htmlRequest({ cookies: { 'oc-theme': 'light' } }), light);
      expect(repository.getComponent.callCount).to.equal(2);

      const lightAgain = createRes(conf);
      await route(htmlRequest({ cookies: { 'oc-theme': 'light' } }), lightAgain);
      expect(lightAgain.body).to.equal(light.body);
      expect(repository.getComponent.callCount).to.equal(2);
    });

    it('skips the cache when a search query is present', async () => {
      const repository = createRepository({
        components: { 'hello-world': makeComponent('hello-world') }
      });
      const route = IndexRoute(repository);
      const conf = baseConf();

      await route(htmlRequest({ query: { q: 'hello' } }), createRes(conf));
      await route(htmlRequest({ query: { q: 'hello' } }), createRes(conf));
      expect(repository.getComponent.callCount).to.equal(2);
    });

    it('invalidates HTML when lastEdit advances', async () => {
      const repository = createRepository({
        components: { 'hello-world': makeComponent('hello-world') }
      });
      const route = IndexRoute(repository);
      const conf = baseConf();

      const first = createRes(conf);
      await route(htmlRequest(), first);
      expect(first.body).to.contain('hello-world');

      setLastEdit(repository, 200);
      const second = createRes(conf);
      await route(htmlRequest(), second);
      expect(repository.getComponent.callCount).to.equal(2);
    });

    it('does not set Cache-Control on HTML responses', async () => {
      const repository = createRepository({
        components: { 'hello-world': makeComponent('hello-world') }
      });
      const route = IndexRoute(repository);

      const res = createRes(baseConf());
      await route(htmlRequest(), res);
      expect(res.headers).to.not.have.property('Cache-Control');
    });
  });

  describe('DiscoveryResponseCache helper', () => {
    it('misses across generations and drops the previous generation', () => {
      const cache = new DiscoveryResponseCache();
      cache.set(100, 'a', { n: 1 });
      expect(cache.get(100, 'a')).to.eql({ n: 1 });
      expect(cache.get(200, 'a')).to.equal(undefined);
      cache.set(200, 'b', { n: 2 });
      expect(cache.get(200, 'a')).to.equal(undefined);
      expect(cache.get(200, 'b')).to.eql({ n: 2 });
    });

    it('builds distinct keys per query variant', () => {
      const req = (query) => ({ cookies: {}, headers: {}, query });
      const keyFor = (query) =>
        getDiscoveryCacheKey(
          getDiscoveryVariant(
            req(query),
            'http://registry.test/',
            false,
            true,
            true,
            'json'
          )
        );
      expect(keyFor({})).to.not.equal(keyFor({ state: 'experimental' }));
      expect(keyFor({})).to.not.equal(keyFor({ meta: 'true' }));
      expect(keyFor({})).to.equal(keyFor({}));
    });
  });
});
