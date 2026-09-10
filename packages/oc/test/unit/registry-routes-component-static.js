const expect = require('chai').expect;
const sinon = require('sinon');

describe('registry : routes : component-static', () => {
  const ComponentStaticRoute = require('../../dist/registry/routes/component-static').default;

  const makeRes = () => {
    const jsonStub = sinon.stub();
    const redirectStub = sinon.stub();
    const statusStub = sinon.stub().returns({ json: jsonStub });
    return {
      jsonStub,
      redirectStub,
      res: {
        status: statusStub,
        redirect: redirectStub
      },
      statusStub
    };
  };

  const makeRepository = (versions) => ({
    getComponentVersions: sinon.stub().resolves(versions),
    getStaticFilePath: sinon
      .stub()
      .callsFake(
        (name, version, file) =>
          `https://cdn.invalid/components/${name}/${version}/${file}`
      )
  });

  describe('when requesting an exact version of a public file', () => {
    let repository;
    let redirectStub;
    let statusStub;

    before(async () => {
      repository = makeRepository(['2.0.366', '2.0.367']);
      const route = ComponentStaticRoute(repository);
      const { res, redirectStub: redirect, statusStub: status } = makeRes();
      redirectStub = redirect;
      statusStub = status;

      await route(
        {
          params: {
            componentName: 'actual-and-forecast',
            componentVersion: '2.0.367',
            splat: 'public/scripts/workerScripts.cjs.js'
          }
        },
        res
      );
    });

    it('should redirect to the CDN file for the exact version', () => {
      expect(redirectStub.calledOnce).to.be.true;
      expect(redirectStub.args[0][0]).to.equal(
        'https://cdn.invalid/components/actual-and-forecast/2.0.367/public/scripts/workerScripts.cjs.js'
      );
    });

    it('should not return an error status', () => {
      expect(statusStub.called).to.be.false;
    });
  });

  describe('when requesting a semver range', () => {
    let repository;
    let redirectStub;

    before(async () => {
      repository = makeRepository(['2.0.366', '2.0.367', '2.1.0']);
      const route = ComponentStaticRoute(repository);

      const { res, redirectStub: redirect } = makeRes();
      redirectStub = redirect;

      await route(
        {
          params: {
            componentName: 'actual-and-forecast',
            componentVersion: '2.x.x',
            splat: 'public/scripts/workerScripts.cjs.js'
          }
        },
        res
      );
    });

    it('should resolve to the max satisfying version', () => {
      expect(redirectStub.args[0][0]).to.equal(
        'https://cdn.invalid/components/actual-and-forecast/2.1.0/public/scripts/workerScripts.cjs.js'
      );
    });

    it('should pass the requested component to version lookup', () => {
      expect(repository.getComponentVersions.calledOnceWith('actual-and-forecast'))
        .to.be.true;
    });
  });

  describe('when the component does not exist', () => {
    let statusStub;
    let jsonStub;
    let redirectStub;

    before(async () => {
      const repository = makeRepository([]);
      const route = ComponentStaticRoute(repository);
      const made = makeRes();
      statusStub = made.statusStub;
      jsonStub = made.jsonStub;
      redirectStub = made.redirectStub;

      await route(
        {
          params: {
            componentName: 'missing-component',
            componentVersion: '1.x.x',
            splat: 'public/file.js'
          }
        },
        made.res
      );
    });

    it('should respond with 404', () => {
      expect(statusStub.calledOnceWith(404)).to.be.true;
    });

    it('should not redirect', () => {
      expect(redirectStub.called).to.be.false;
    });

    it('should explain the missing component', () => {
      expect(jsonStub.args[0][0].err).to.contain('missing-component');
    });
  });

  describe('when version lookup fails', () => {
    let statusStub;
    let redirectStub;

    before(async () => {
      const repository = {
        getComponentVersions: sinon.stub().rejects(new Error('cdn down')),
        getStaticFilePath: sinon.stub()
      };
      const route = ComponentStaticRoute(repository);
      const made = makeRes();
      statusStub = made.statusStub;
      redirectStub = made.redirectStub;

      await route(
        {
          params: {
            componentName: 'actual-and-forecast',
            componentVersion: '2.x.x',
            splat: 'public/file.js'
          }
        },
        made.res
      );
    });

    it('should respond with 404', () => {
      expect(statusStub.calledOnceWith(404)).to.be.true;
    });

    it('should not redirect', () => {
      expect(redirectStub.called).to.be.false;
    });
  });

  describe('when the range cannot be satisfied', () => {
    let statusStub;
    let jsonStub;

    before(async () => {
      const repository = makeRepository(['1.0.0']);
      const route = ComponentStaticRoute(repository);
      const made = makeRes();
      statusStub = made.statusStub;
      jsonStub = made.jsonStub;

      await route(
        {
          params: {
            componentName: 'actual-and-forecast',
            componentVersion: '2.x.x',
            splat: 'public/file.js'
          }
        },
        made.res
      );
    });

    it('should respond with 404', () => {
      expect(statusStub.calledOnceWith(404)).to.be.true;
    });

    it('should mention the requested version', () => {
      expect(jsonStub.args[0][0].err).to.contain('2.x.x');
    });
  });

  describe('when requesting a private file', () => {
    const privateFiles = [
      'server.js',
      '.env',
      'public/server.js',
      'public/.env'
    ];

    for (const splat of privateFiles) {
      describe(`splat "${splat}"`, () => {
        let repository;
        let statusStub;
        let redirectStub;

        before(async () => {
          repository = makeRepository(['1.0.0']);
          const route = ComponentStaticRoute(repository);
          const made = makeRes();
          statusStub = made.statusStub;
          redirectStub = made.redirectStub;

          await route(
            {
              params: {
                componentName: 'hello-world',
                componentVersion: '1.0.0',
                splat
              }
            },
            made.res
          );
        });

        it('should respond with 404', () => {
          expect(statusStub.calledOnceWith(404)).to.be.true;
        });

        it('should not redirect', () => {
          expect(redirectStub.called).to.be.false;
        });

        it('should not look up versions', () => {
          expect(repository.getComponentVersions.called).to.be.false;
        });
      });
    }
  });

  describe('when the path is unsafe or empty', () => {
    const unsafeSplats = ['', '../server.js', 'a/../../b', 'a\\b'];

    for (const splat of unsafeSplats) {
      describe(`splat "${splat || '(empty)'}"`, () => {
        let repository;
        let statusStub;
        let redirectStub;

        before(async () => {
          repository = makeRepository(['1.0.0']);
          const route = ComponentStaticRoute(repository);
          const made = makeRes();
          statusStub = made.statusStub;
          redirectStub = made.redirectStub;

          await route(
            {
              params: {
                componentName: 'hello-world',
                componentVersion: '1.0.0',
                splat
              }
            },
            made.res
          );
        });

        it('should respond with 404', () => {
          expect(statusStub.calledOnceWith(404)).to.be.true;
        });

        it('should not redirect', () => {
          expect(redirectStub.called).to.be.false;
        });
      });
    }
  });

  describe('when registered on the router', () => {
    const { create } = require('../../dist/registry/router');

    const collectRoutes = (conf) => {
      const seen = [];
      const adapter = {
        route: (method, path, id) => {
          seen.push({ method, path, id });
        },
        fromConnect: (handler) => handler
      };
      const repository = {
        getComponent: async () => ({})
      };
      create(
        adapter,
        {
          templates: [],
          plugins: {},
          dependencies: [],
          ...conf
        },
        repository
      );
      return seen;
    };

    it('should register component-static in hosted mode', () => {
      const routes = collectRoutes({
        prefix: '/',
        local: false,
        discovery: {},
        beforePublish: (req, res, next) => next()
      });
      const staticRoute = routes.find((r) => r.id === 'component-static');

      expect(staticRoute).to.not.be.undefined;
      expect(staticRoute.method).to.equal('get');
      expect(staticRoute.path).to.equal(
        '/:componentName/:componentVersion/static/*splat'
      );
    });

    it('should keep local-static and skip component-static in local mode', () => {
      const routes = collectRoutes({
        prefix: '/',
        local: true,
        discovery: {}
      });
      const ids = routes.map((r) => r.id);

      expect(ids).to.include('local-static');
      expect(ids).to.not.include('component-static');
    });

    it('should respect the configured prefix', () => {
      const routes = collectRoutes({
        prefix: '/v2/',
        local: false,
        discovery: {},
        beforePublish: (req, res, next) => next()
      });
      const staticRoute = routes.find((r) => r.id === 'component-static');

      expect(staticRoute.path).to.equal(
        '/v2/:componentName/:componentVersion/static/*splat'
      );
    });
  });
});
