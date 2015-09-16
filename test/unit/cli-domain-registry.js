'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

var getRegistry = function(dependencies, opts){
  var Registry = injectr('../../cli/domain/registry.js', {
        '../../utils/request': dependencies.request,
        'fs-extra': dependencies.fs,
        '../../utils/put': dependencies.put,
        '../domain/url-parser': dependencies.urlParser
      }, { Buffer: Buffer });

  return new Registry(opts);
};

describe('cli : domain : registry', function(){

  describe('registry specified at runtime', function(){

    it('should use the registry specified', function(){
      var registry = getRegistry({}, { registry: 'http://myotherregistry.com'});

      registry.get(function(err, registries){
        expect(registries[0]).to.eql('http://myotherregistry.com');
      });
    });
  });

  describe('when adding registry', function(){

    describe('when registry does not end with "/"', function(){

      it('should append the slash when doing the request', function(){
        var spy = sinon.spy(),
            registry = getRegistry({ request: spy });
        registry.add('http://some-api.com/asd');

        expect(spy.getCall(0).args[0]).to.eql('http://some-api.com/asd/');
      });

      it('should save the file with slashed url', function(){
        var requestStub = sinon.stub(),
            fsStub = {
              readJson: sinon.stub(),
              writeJson: sinon.spy()
            };

        requestStub.yields(null, JSON.stringify({
          type: 'oc-registry'
        }));

        fsStub.readJson.yields(null, {});

        var registry = getRegistry({ request: requestStub, fs: fsStub });

        registry.add('http://some-api.com/asd');

        expect(fsStub.writeJson.getCall(0).args[1]).to.eql({
          registries: ['http://some-api.com/asd/']
        });
      });
    });
  });

  describe('when publishing to registry', function(){

    describe('when no credentials used', function(){

      var args, putSpy;
      beforeEach(function(){
        putSpy = sinon.spy();
        var registry = getRegistry({ put: putSpy });
        registry.putComponent({ route: 'http://registry.com/component/1.0.0', path: '/blabla/path' }, function(){});
        args = putSpy.args[0];
      });

      it('should do the request without headers', function(){
        expect(putSpy.called).to.be.true;
        expect(args[0]).to.eql('http://registry.com/component/1.0.0');
        expect(args[1]).to.eql('/blabla/path');
        expect(args[2]).to.eql({});
      });
    });

    describe('when credentials used', function(){

      var args, putSpy;
      beforeEach(function(){
        putSpy = sinon.spy();
        var registry = getRegistry({ put: putSpy });
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
        expect(args[2]).to.eql({ 'Authorization': 'Basic am9obmRvZTphUGFzc3cwcmQ=' });
      });
    });
  });

  describe('when getting preview url', function(){

    var err, res;
    var execute = function(href, error, parsed, done){
      var registry = getRegistry({ 
        request: sinon.stub().yields(error, JSON.stringify(parsed)),
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
          componentName: 'component',
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
          componentName: 'component',
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
          componentName: 'component',
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
          componentName: 'component',
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
          componentName: 'component',
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
          componentName: 'component',
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
