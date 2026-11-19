const expect = require('chai').expect;
const sinon = require('sinon');

const ComponentInfoRoute =
  require('../../dist/registry/routes/component-info').default;
const IndexRoute = require('../../dist/registry/routes/index').default;
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

  describe('GET /', () => {
    const requestList = async (transformInfo, query) => {
      const repository = {
        getComponent: sinon.stub().resolves(component()),
        getComponents: sinon.stub().resolves(['hello-world'])
      };
      const res = makeRes(transformInfo);
      await IndexRoute(repository)({ headers: {}, query }, res);
      return res.response;
    };

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
