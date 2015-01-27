'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

var getRegistry = function(dependencies){
  var Registry = injectr('../../cli/domain/registry.js', {
        '../../utils/request': dependencies.request,
        'fs-extra': dependencies.fs
      });
      
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
});