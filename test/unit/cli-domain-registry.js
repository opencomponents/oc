'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const getRegistry = function(dependencies, opts){
  dependencies.fs = dependencies.fs || {};
  dependencies.fs.readJsonSync = sinon.stub().returns({ version: '1.2.3' });
  const Registry = injectr('../../src/cli/domain/registry.js', {
    'minimal-request': dependencies.request,
    'fs-extra': dependencies.fs,
    '../../utils/put': dependencies.put,
    '../domain/url-parser': dependencies.urlParser,
    path: {
      join: sinon.stub().returns('/hello/world')
    }
  }, {
    Buffer: Buffer,
    __dirname: '/hello',
    process: {
      arch: 'x64',
      platform: 'darwin',
      version: 'v0.10.35'
    }
  });

  return new Registry(opts);
};

describe('cli : domain : registry', function(){

  describe('registry specified at runtime', function(){

    it('should use the registry specified', function(){
      const registry = getRegistry({}, { registry: 'http://myotherregistry.com'});

      registry.get(function(err, registries){
        expect(registries[0]).to.eql('http://myotherregistry.com');
      });
    });
  });

  describe('when adding registry', function(){

    describe('when registry does not end with "/"', function(){

      it('should append the slash when doing the request', function(done){
        const requestStub = sinon.stub();
        requestStub.yields('err');
        const registry = getRegistry({ request: requestStub });

        registry.add('http://some-api.com/asd', function(){
          expect(requestStub.getCall(0).args[0].url).to.eql('http://some-api.com/asd/');
          done();
        });
      });

      it('should save the file with slashed url', function(){
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

  describe('when publishing to registry', function(){

    describe('when no credentials used', function(){

      let args, putSpy;
      beforeEach(function(){
        putSpy = sinon.spy();
        const registry = getRegistry({ put: putSpy });
        registry.putComponent({ route: 'http://registry.com/component/1.0.0', path: '/blabla/path' }, function(){});
        args = putSpy.args[0];
      });

      it('should do the request without authorization header', function(){
        expect(putSpy.called).to.be.true;
        expect(args[0]).to.eql('http://registry.com/component/1.0.0');
        expect(args[1]).to.eql('/blabla/path');
        expect(!!args[2]['Authorization']).to.be.false;
      });

      it('should do the request with user-agent including cli version and node details', function(){
        expect(args[2]['user-agent']).to.equal('oc-cli-1.2.3/v0.10.35-darwin-x64');
      });
    });

    describe('when credentials used', function(){

      let args, putSpy;
      beforeEach(function(){
        putSpy = sinon.spy();
        const registry = getRegistry({ put: putSpy });
        registry.putComponent({
          route: 'http://registry.com/component/1.0.0',
          path: '/blabla/path',
          username: 'johndoe',
          password: 'aPassw0rd'
        }, function(){});
        args = putSpy.args[0];
      });

      it('should do the request with authorization header', function(){
        expect(putSpy.called).to.be.true;
        expect(args[0]).to.eql('http://registry.com/component/1.0.0');
        expect(args[1]).to.eql('/blabla/path');
        expect(args[2]['Authorization']).to.eql('Basic am9obmRvZTphUGFzc3cwcmQ=');
      });

      it('should do the request with user-agent including cli version and node details', function(){
        expect(args[2]['user-agent']).to.equal('oc-cli-1.2.3/v0.10.35-darwin-x64');
      });
    });
  });

  describe('when getting preview url', function(){

    let err, res;
    const execute = function(href, error, parsed, done){
      const registry = getRegistry({
        request: sinon.stub().yields(error, parsed),
        urlParser: {
          parse: sinon.stub().returns(parsed)
        }
      });
      registry.getComponentPreviewUrlByUrl(href, function(e, r){
        err = e;
        res = r;
        done();
      });
    };

    describe('when href not valid', function(){
      beforeEach(function(done){
        execute('http://registry.com/not-existing-component', '404!!!', {}, done);
      });

      it('should show error message', function(){
        expect(err).to.equal('404!!!');
      });
    });

    describe('when href = /component', function(){
      beforeEach(function(done){
        execute('http://registry.com/component', null, {
          href: 'http://registry.com/component',
          registryUrl: 'http://registry.com/',
          name: 'component',
          version: '',
          parameters: {}
        }, done);
      });

      it('href should be /component/~preview/', function(){
        expect(res).to.equal('http://registry.com/component/~preview/');
      });
    });

    describe('when href = /component/1.X.X', function(){

      beforeEach(function(done){
        execute('http://registry.com/component/1.X.X', null, {
          href: 'http://registry.com/component/1.X.X',
          registryUrl: 'http://registry.com/',
          name: 'component',
          version: '1.X.X',
          parameters: {}
        }, done);
      });

      it('href should be /component/1.X.X/~preview/', function(){
        expect(res).to.equal('http://registry.com/component/1.X.X/~preview/');
      });
    });

    describe('when href = /component?hello=world', function(){

      beforeEach(function(done){
        execute('http://registry.com/component?hello=world', null, {
          href: 'http://registry.com/component?hello=world',
          registryUrl: 'http://registry.com/',
          name: 'component',
          version: '',
          parameters: {hello: 'world'}
        }, done);
      });

      it('href should be /component/~preview/?hello=world', function(){
        expect(res).to.equal('http://registry.com/component/~preview/?hello=world');
      });
    });

    describe('when href = /component/?hello=world', function(){

      beforeEach(function(done){
        execute('http://registry.com/component/?hello=world', null, {
          href: 'http://registry.com/component/?hello=world',
          registryUrl: 'http://registry.com/',
          name: 'component',
          version: '',
          parameters: {hello: 'world'}
        }, done);
      });

      it('href should be /component/~preview/?hello=world', function(){
        expect(res).to.equal('http://registry.com/component/~preview/?hello=world');
      });
    });

    describe('when href = /component/1.X.X?hello=world', function(){

      beforeEach(function(done){
        execute('http://registry.com/component/1.X.X?hello=world', null, {
          href: 'http://registry.com/component/1.X.X?hello=world',
          registryUrl: 'http://registry.com/',
          name: 'component',
          version: '1.X.X',
          parameters: {hello: 'world'}
        }, done);
      });

      it('href should be /component/1.X.X/~preview/?hello=world', function(){
        expect(res).to.equal('http://registry.com/component/1.X.X/~preview/?hello=world');
      });
    });

    describe('when href = /component/1.X.X/?hello=world', function(){

      beforeEach(function(done){
        execute('http://registry.com/component/1.X.X/?hello=world', null, {
          href: 'http://registry.com/component/1.X.X/?hello=world',
          registryUrl: 'http://registry.com/',
          name: 'component',
          version: '1.X.X',
          parameters: {hello: 'world'}
        }, done);
      });

      it('href should be /component/1.X.X/~preview/?hello=world', function(){
        expect(res).to.equal('http://registry.com/component/1.X.X/~preview/?hello=world');
      });
    });
  });
});
