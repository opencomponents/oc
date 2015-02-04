'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

var getRegistry = function(dependencies){
  var Registry = injectr('../../cli/domain/registry.js', {
        '../../utils/request': dependencies.request,
        'fs-extra': dependencies.fs,
        '../../utils/put': dependencies.put
      }, { Buffer: Buffer });
      
  return new Registry();
};

describe('cli : domain : registry', function(){

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
});