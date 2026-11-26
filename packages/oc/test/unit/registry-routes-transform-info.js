const expect = require('chai').expect;
const sinon = require('sinon');

const ComponentInfoRoute =
  require('../../dist/registry/routes/component-info').default;
const ComponentPreviewRoute =
  require('../../dist/registry/routes/component-preview').default;
const IndexRoute = require('../../dist/registry/routes/index').default;
const PreviewView = require('../../dist/registry/views/preview').default;
const eventsHandler =
  require('../../dist/registry/domain/events-handler').default;

describe('registry : routes : discovery.transformInfo', () => {
  const component = () => ({
    name: 'hello-world',
    version: '1.0.0',
    allVersions: ['1.0.0'],
    author: 'Jane Doe <jane@example.com>',
    owners: ['jane@example.com'],
    description: 'A component',
    keywords: ['example'],
    oc: {
      date: 1700000000000,
      files: { template: {} },
      parameters: {}
    }
  });

  const stripPrivate = ({ author, owners, ...info }) => ({
    ...info,
    team: 'payments'
  });

  const makeRes = (transformInfo) => {
    const res = {
      conf: {
        baseUrl: 'http://registry.test/',
        discovery: { api: true, ui: true, experimental: true, transformInfo }
      },
      status: sinon.stub().callsFake((status) => ({
        json: (body) => {
          res.response = { status, body };
        }
      }))
    };
    return res;
  };

  describe('~info', () => {
    const requestInfo = async (transformInfo) => {
      const repository = {
        getComponent: sinon.stub().resolves(component()),
        getComponentsDetails: sinon.stub().resolves(undefined)
      };
      const res = makeRes(transformInfo);
      await ComponentInfoRoute({}, repository)(
        {
          headers: { accept: 'application/json' },
          params: { componentName: 'hello-world', componentVersion: '1.x.x' }
        },
        res
      );
      return res;
    };

    it('returns the transformed info with requestVersion', async () => {
      const transformInfo = sinon.spy(stripPrivate);
      const { response } = await requestInfo(transformInfo);

      expect(transformInfo.calledOnce).to.be.true;
      expect(transformInfo.args[0][0]).to.eql(component());
      expect(response.status).to.equal(200);
      expect(response.body).to.not.have.property('author');
      expect(response.body).to.not.have.property('owners');
      expect(response.body.team).to.equal('payments');
      expect(response.body.requestVersion).to.equal('1.x.x');
    });

    it('supports async transforms', async () => {
      const { response } = await requestInfo(async (info) =>
        stripPrivate(info)
      );

      expect(response.body).to.not.have.property('owners');
      expect(response.body.team).to.equal('payments');
    });

    describe('when the transform fails', () => {
      let errorListener;

      beforeEach(() => {
        errorListener = sinon.spy();
        eventsHandler.on('error', errorListener);
      });

      afterEach(() => eventsHandler.off('error', errorListener));

      it('responds with a 500 and never the raw info', async () => {
        const res = await requestInfo(() => {
          throw new Error('boom');
        });

        expect(res.response.status).to.equal(500);
        expect(res.response.body).to.eql({
          code: 'TRANSFORM_INFO_FAILED',
          error: 'discovery.transformInfo failed: Error: boom'
        });
        expect(errorListener.calledOnce).to.be.true;
        expect(errorListener.args[0][0].code).to.equal('TRANSFORM_INFO_FAILED');
      });

      it('responds with a 500 when it does not return an object', async () => {
        const res = await requestInfo(() => undefined);

        expect(res.response.status).to.equal(500);
        expect(res.response.body.code).to.equal('TRANSFORM_INFO_FAILED');
      });
    });
  });

  describe('~preview', () => {
    const requestPreview = (transformInfo, discovery = { api: true }) => {
      const repository = {
        getComponent: sinon.stub().resolves(component()),
        getTemplatesInfo: sinon.stub().returns([])
      };
      const res = makeRes(transformInfo);
      res.conf.discovery = { ...discovery, transformInfo };

      return new Promise((resolve) => {
        res.status = (status) => ({
          json: (body) => resolve({ status, body })
        });
        ComponentPreviewRoute({}, repository)(
          {
            headers: { accept: 'application/json' },
            params: { componentName: 'hello-world', componentVersion: '1.x.x' },
            query: {}
          },
          res
        );
      });
    };

    it('returns the transformed info with requestVersion', async () => {
      const response = await requestPreview(stripPrivate);

      expect(response.status).to.equal(200);
      expect(response.body).to.not.have.property('author');
      expect(response.body).to.not.have.property('owners');
      expect(response.body.team).to.equal('payments');
      expect(response.body.requestVersion).to.equal('1.x.x');
    });

    it('responds with a 500 when the transform fails', async () => {
      const response = await requestPreview(() => {
        throw new Error('boom');
      });

      expect(response.status).to.equal(500);
      expect(response.body.code).to.equal('TRANSFORM_INFO_FAILED');
    });

    it('responds with a 401 when the discovery API is disabled', async () => {
      const response = await requestPreview(undefined, { api: false });

      expect(response.status).to.equal(401);
      expect(response.body.code).to.equal('DISCOVERY_API_DISABLED');
    });

    it('renders the HTML preview from info without oc', () => {
      const { oc, ...info } = component();
      const html = PreviewView({
        href: 'http://registry.test/',
        component: info,
        qs: '',
        liveReload: '',
        templates: [],
        robots: true
      });

      expect(html).to.contain('hello-world/1.0.0/');
    });
  });

  describe('GET /', () => {
    const makeRepository = (componentsList = { components: {} }) => ({
      getComponent: sinon.stub().resolves(component()),
      getComponents: sinon.stub().resolves(['hello-world']),
      getComponentsList: sinon.stub().returns(componentsList)
    });

    const requestList = async (transformInfo, query) => {
      const res = makeRes(transformInfo);
      await IndexRoute(makeRepository())({ headers: {}, query }, res);
      return res.response;
    };

    describe('response cache', () => {
      const request = async (route, transformInfo, query) => {
        const res = makeRes(transformInfo);
        await route({ headers: {}, query }, res);
        return res.response;
      };

      it('reuses the response while the components list is unchanged', async () => {
        const repository = makeRepository();
        const route = IndexRoute(repository);
        const transformInfo = sinon.spy(stripPrivate);

        const first = await request(route, transformInfo, { meta: 'team' });
        const second = await request(route, transformInfo, { meta: 'team' });

        expect(second).to.eql(first);
        expect(transformInfo.calledOnce).to.be.true;
        expect(repository.getComponent.calledOnce).to.be.true;
      });

      it('caches responses without transformInfo', async () => {
        const repository = makeRepository();
        const route = IndexRoute(repository);

        await request(route, undefined, { meta: 'true' });
        const response = await request(route, undefined, { meta: 'true' });

        expect(response.status).to.equal(200);
        expect(response.body.components[0].name).to.equal('hello-world');
        expect(repository.getComponent.calledOnce).to.be.true;
      });

      it('caches each meta and state combination separately', async () => {
        const repository = makeRepository();
        const route = IndexRoute(repository);

        const withMeta = await request(route, undefined, { meta: 'true' });
        const withoutMeta = await request(route, undefined, {});

        expect(withMeta.body.components[0].href).to.equal(
          'http://registry.test/hello-world'
        );
        expect(withoutMeta.body.components).to.eql([
          'http://registry.test/hello-world'
        ]);
        expect(repository.getComponent.calledTwice).to.be.true;
      });

      it('rebuilds the response when the components list changes', async () => {
        const repository = makeRepository();
        const route = IndexRoute(repository);

        await request(route, undefined, { meta: 'true' });
        repository.getComponentsList.returns({ components: {} });
        await request(route, undefined, { meta: 'true' });

        expect(repository.getComponent.calledTwice).to.be.true;
      });

      it('shares the in-flight response between concurrent requests', async () => {
        const repository = makeRepository();
        const route = IndexRoute(repository);
        const transformInfo = sinon.spy(async (info) => stripPrivate(info));

        await Promise.all([
          request(route, transformInfo, { meta: 'true' }),
          request(route, transformInfo, { meta: 'true' })
        ]);

        expect(transformInfo.calledOnce).to.be.true;
      });

      it('does not cache transform failures', async () => {
        const repository = makeRepository();
        const route = IndexRoute(repository);
        const transformInfo = sinon.stub();
        transformInfo.onFirstCall().rejects(new Error('boom'));
        transformInfo.onSecondCall().callsFake(stripPrivate);

        const failed = await request(route, transformInfo, { meta: 'team' });
        const response = await request(route, transformInfo, { meta: 'team' });

        expect(failed.status).to.equal(500);
        expect(response.status).to.equal(200);
        expect(response.body.components[0].team).to.equal('payments');
      });

      it('does not cache when there is no components list (local)', async () => {
        const repository = makeRepository();
        repository.getComponentsList.returns(undefined);
        const route = IndexRoute(repository);

        await request(route, undefined, { meta: 'true' });
        await request(route, undefined, { meta: 'true' });

        expect(repository.getComponent.calledTwice).to.be.true;
      });
    });

    it('applies the transform with meta=true', async () => {
      const response = await requestList(stripPrivate, { meta: 'true' });

      expect(response.status).to.equal(200);
      expect(response.body.components).to.eql([
        {
          href: 'http://registry.test/hello-world',
          name: 'hello-world',
          version: '1.0.0',
          author: undefined,
          description: 'A component',
          state: undefined,
          keywords: ['example'],
          publishDate: new Date(1700000000000).toISOString()
        }
      ]);
    });

    it('picks requested fields from the transformed info', async () => {
      const response = await requestList(stripPrivate, {
        meta: 'owners,author,team'
      });

      expect(response.body.components).to.eql([
        {
          href: 'http://registry.test/hello-world',
          owners: undefined,
          author: undefined,
          team: 'payments'
        }
      ]);
    });

    it('omits publishDate when the transform removes oc', async () => {
      const response = await requestList(({ oc, ...info }) => info, {
        meta: 'true'
      });

      expect(response.body.components[0].publishDate).to.equal(undefined);
      expect(response.body.components[0].href).to.equal(
        'http://registry.test/hello-world'
      );
    });

    it('does not run without meta', async () => {
      const transformInfo = sinon.spy(stripPrivate);
      const response = await requestList(transformInfo, {});

      expect(transformInfo.called).to.be.false;
      expect(response.body.components).to.eql([
        'http://registry.test/hello-world'
      ]);
    });

    it('responds with a 500 when the transform rejects', async () => {
      const response = await requestList(
        () => Promise.reject(new Error('boom')),
        { meta: 'true' }
      );

      expect(response.status).to.equal(500);
      expect(response.body.code).to.equal('TRANSFORM_INFO_FAILED');
    });
  });
});
