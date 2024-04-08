'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const getRegistry = function (dependencies, opts) {
  dependencies.fs = dependencies.fs || {};
  dependencies.fs.readJsonSync = sinon.stub().returns({ version: '1.2.3' });
  const Registry = injectr(
    '../../dist/cli/domain/registry.js',
    {
      got: dependencies.got,
      'fs-extra': dependencies.fs,
      '../../utils/put': dependencies.put,
      '../domain/url-parser': dependencies.urlParser,
      'node:path': {
        join: sinon.stub().returns('/hello/world')
      }
    },
    {
      Buffer: Buffer,
      __dirname: '/hello',
      process: {
        arch: 'x64',
        platform: 'darwin',
        version: 'v0.10.35'
      }
    }
  ).default;

  return Registry(opts);
};

describe('cli : domain : registry', () => {
  describe('registry specified at runtime', () => {
    it('should use the registry specified', () => {
      const registry = getRegistry(
        {},
        { registry: 'http://myotherregistry.com' }
      );

      registry.get((err, registries) => {
        expect(registries[0]).to.eql('http://myotherregistry.com');
      });
    });
  });

  describe('when adding registry', () => {
    describe('when registry does not end with "/"', () => {
      it('should append the slash when doing the request', done => {
        const gotStub = sinon.stub().rejects(new Error('err'));
        const registry = getRegistry({ got: gotStub });

        registry.add('http://some-api.com/asd').finally(() => {
          expect(gotStub.getCall(0).args[0]).to.eql('http://some-api.com/asd/');
          done();
        });
      });

      it('should save the file with slashed url', done => {
        const gotStub = sinon.stub().returns({
          json: sinon.stub().resolves({ type: 'oc-registry' })
        });
        const fsStub = {
          readJson: sinon.stub(),
          writeJson: sinon.spy()
        };

        fsStub.readJson.resolves({});

        const registry = getRegistry({
          got: gotStub,
          fs: fsStub
        });

        registry.add('http://some-api.com/asd').finally(() => {
          expect(fsStub.writeJson.getCall(0).args[1]).to.eql({
            registries: ['http://some-api.com/asd/']
          });
          done();
        });
      });
    });
  });

  describe('when publishing to registry', () => {
    describe('when no credentials used', () => {
      let args;
      let putSpy;
      beforeEach(() => {
        putSpy = sinon.stub().resolves();
        const registry = getRegistry({ put: putSpy });
        registry.putComponent(
          {
            route: 'http://registry.com/component/1.0.0',
            path: '/blabla/path'
          },
          () => {}
        );
        args = putSpy.args[0];
      });

      it('should do the request without authorization header', () => {
        expect(putSpy.called).to.be.true;
        expect(args[0]).to.eql('http://registry.com/component/1.0.0');
        expect(args[1]).to.eql('/blabla/path');
        expect(!!args[2]['Authorization']).to.be.false;
      });

      it('should do the request with user-agent including cli version and node details', () => {
        expect(args[2]['user-agent']).to.equal(
          'oc-cli-1.2.3/v0.10.35-darwin-x64'
        );
      });
    });

    describe('when credentials used', () => {
      let args;
      let putSpy;
      beforeEach(() => {
        putSpy = sinon.stub().resolves();
        const registry = getRegistry({ put: putSpy });
        registry.putComponent(
          {
            route: 'http://registry.com/component/1.0.0',
            path: '/blabla/path',
            username: 'johndoe',
            password: 'aPassw0rd'
          },
          () => {}
        );
        args = putSpy.args[0];
      });

      it('should do the request with authorization header', () => {
        expect(putSpy.called).to.be.true;
        expect(args[0]).to.eql('http://registry.com/component/1.0.0');
        expect(args[1]).to.eql('/blabla/path');
        expect(args[2]['Authorization']).to.eql(
          'Basic am9obmRvZTphUGFzc3cwcmQ='
        );
      });

      it('should do the request with user-agent including cli version and node details', () => {
        expect(args[2]['user-agent']).to.equal(
          'oc-cli-1.2.3/v0.10.35-darwin-x64'
        );
      });
    });
  });

  describe('when getting preview url', () => {
    let err;
    let res;
    const execute = function (href, error, parsed, done) {
      const registry = getRegistry({
        request: sinon.stub().yields(error, parsed),
        got: sinon.stub().returns({
          json: error
            ? sinon.stub().rejects(error)
            : sinon.stub().resolves(parsed)
        }),
        urlParser: {
          parse: sinon.stub().returns(parsed)
        }
      });
      registry
        .getComponentPreviewUrlByUrl(href)
        .then(r => (res = r))
        .catch(e => (err = e))
        .finally(done);
    };

    describe('when href not valid', () => {
      beforeEach(done => {
        execute(
          'http://registry.com/not-existing-component',
          new Error('404!!!'),
          {},
          done
        );
      });

      it('should show error message', () => {
        expect(err.message).to.equal('404!!!');
      });
    });

    describe('when href = /component', () => {
      beforeEach(done => {
        execute(
          'http://registry.com/component',
          null,
          {
            href: 'http://registry.com/component',
            registryUrl: 'http://registry.com/',
            name: 'component',
            version: '',
            parameters: {}
          },
          done
        );
      });

      it('href should be /component/~preview/', () => {
        expect(res).to.equal('http://registry.com/component/~preview/');
      });
    });

    describe('when href = /component/1.X.X', () => {
      beforeEach(done => {
        execute(
          'http://registry.com/component/1.X.X',
          null,
          {
            href: 'http://registry.com/component/1.X.X',
            registryUrl: 'http://registry.com/',
            name: 'component',
            version: '1.X.X',
            parameters: {}
          },
          done
        );
      });

      it('href should be /component/1.X.X/~preview/', () => {
        expect(res).to.equal('http://registry.com/component/1.X.X/~preview/');
      });
    });

    describe('when href = /component?hello=world', () => {
      beforeEach(done => {
        execute(
          'http://registry.com/component?hello=world',
          null,
          {
            href: 'http://registry.com/component?hello=world',
            registryUrl: 'http://registry.com/',
            name: 'component',
            version: '',
            parameters: { hello: 'world' }
          },
          done
        );
      });

      it('href should be /component/~preview/?hello=world', () => {
        expect(res).to.equal(
          'http://registry.com/component/~preview/?hello=world'
        );
      });
    });

    describe('when href = /component/?hello=world', () => {
      beforeEach(done => {
        execute(
          'http://registry.com/component/?hello=world',
          null,
          {
            href: 'http://registry.com/component/?hello=world',
            registryUrl: 'http://registry.com/',
            name: 'component',
            version: '',
            parameters: { hello: 'world' }
          },
          done
        );
      });

      it('href should be /component/~preview/?hello=world', () => {
        expect(res).to.equal(
          'http://registry.com/component/~preview/?hello=world'
        );
      });
    });

    describe('when href = /component/1.X.X?hello=world', () => {
      beforeEach(done => {
        execute(
          'http://registry.com/component/1.X.X?hello=world',
          null,
          {
            href: 'http://registry.com/component/1.X.X?hello=world',
            registryUrl: 'http://registry.com/',
            name: 'component',
            version: '1.X.X',
            parameters: { hello: 'world' }
          },
          done
        );
      });

      it('href should be /component/1.X.X/~preview/?hello=world', () => {
        expect(res).to.equal(
          'http://registry.com/component/1.X.X/~preview/?hello=world'
        );
      });
    });

    describe('when href = /component/1.X.X/?hello=world', () => {
      beforeEach(done => {
        execute(
          'http://registry.com/component/1.X.X/?hello=world',
          null,
          {
            href: 'http://registry.com/component/1.X.X/?hello=world',
            registryUrl: 'http://registry.com/',
            name: 'component',
            version: '1.X.X',
            parameters: { hello: 'world' }
          },
          done
        );
      });

      it('href should be /component/1.X.X/~preview/?hello=world', () => {
        expect(res).to.equal(
          'http://registry.com/component/1.X.X/~preview/?hello=world'
        );
      });
    });
  });
});
