'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const getRegistry = function(dependencies, opts) {
  dependencies.fs = dependencies.fs || {};
  dependencies.fs.readJsonSync = sinon.stub().returns({ version: '1.2.3' });
  const Registry = injectr(
    '../../src/cli/domain/registry.js',
    {
      'minimal-request': dependencies.request,
      'fs-extra': dependencies.fs,
      '../../utils/put': dependencies.put,
      '../domain/url-parser': dependencies.urlParser,
      path: {
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
  );

  return new Registry(opts);
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
        const requestStub = sinon.stub();
        requestStub.yields('err');
        const registry = getRegistry({ request: requestStub });

        registry.add('http://some-api.com/asd', () => {
          expect(requestStub.getCall(0).args[0].url).to.eql(
            'http://some-api.com/asd/'
          );
          done();
        });
      });

      it('should save the file with slashed url', () => {
        const requestStub = sinon.stub(),
          fsStub = {
            readJson: sinon.stub(),
            writeJson: sinon.spy()
          };

        requestStub.yields(null, { type: 'oc-registry' });

        fsStub.readJson.yields(null, {});

        const registry = getRegistry({ request: requestStub, fs: fsStub });

        registry.add('http://some-api.com/asd');

        expect(fsStub.writeJson.getCall(0).args[1]).to.eql({
          registries: ['http://some-api.com/asd/']
        });
      });
    });
  });

  describe('when publishing to registry', () => {
    describe('when no credentials used', () => {
      let args, putSpy;
      beforeEach(() => {
        putSpy = sinon.spy();
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
      let args, putSpy;
      beforeEach(() => {
        putSpy = sinon.spy();
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
    let err, res;
    const execute = function(href, error, parsed, done) {
      const registry = getRegistry({
        request: sinon.stub().yields(error, parsed),
        urlParser: {
          parse: sinon.stub().returns(parsed)
        }
      });
      registry.getComponentPreviewUrlByUrl(href, (e, r) => {
        err = e;
        res = r;
        done();
      });
    };

    describe('when href not valid', () => {
      beforeEach(done => {
        execute(
          'http://registry.com/not-existing-component',
          '404!!!',
          {},
          done
        );
      });

      it('should show error message', () => {
        expect(err).to.equal('404!!!');
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
