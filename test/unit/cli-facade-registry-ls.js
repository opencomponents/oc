'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : registry : ls', function(){

  var logSpy = {},
    Registry = require('../../src/cli/domain/registry'),
    registry = new Registry(),
    RegistryFacade = require('../../src/cli/facade/registry-ls'),
    registryFacade = new RegistryFacade({ registry: registry, logger: logSpy });

  var execute = function(){
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    logSpy.warn = sinon.spy();
    registryFacade({}, function(){});
  };


  describe('when no registries linked to the app', function(){

    beforeEach(function(){
      sinon.stub(registry, 'get').yields(null, []);
      execute();
    }); 

    afterEach(function(){
      registry.get.restore();
    });

    it('should introduce the list of registries', function(){
      expect(logSpy.warn.args[0][0]).to.equal('oc linked registries:');
    });

    it('should log an error', function(){
      expect(logSpy.err.args[0][0]).to.equal('oc registries not found. Run "oc registry add <registry href>"');
    });
  });

  describe('when registries linked to the app', function(){

    beforeEach(function(){
      sinon.stub(registry, 'get').yields(null, ['http://www.registry.com', 'https://www.anotherregistry.com']);
      execute();
    });

    afterEach(function(){
      registry.get.restore();
    });

    it('should introduce the list of registries', function(){
      expect(logSpy.warn.args[0][0]).to.equal('oc linked registries:');
    });

    it('should list the linked registries', function(){
      expect(logSpy.ok.args[0][0]).to.equal('http://www.registry.com');
      expect(logSpy.ok.args[1][0]).to.equal('https://www.anotherregistry.com');
    });
  });
});