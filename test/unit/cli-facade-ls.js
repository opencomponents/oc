'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : ls', function(){

  var logSpy = {},
      Registry = require('../../cli/domain/registry'),
      registry = new Registry(),
      LsFacade = require('../../cli/facade/ls'),
      lsFacade = new LsFacade({ registry: registry, logger: logSpy });

  var execute = function(opts){
    logSpy.log = sinon.spy();
    lsFacade(opts);
  };

  describe('when no registries linked to the app', function(){
    
    beforeEach(function(){
      sinon.stub(registry, 'get').yields(null, []);
      execute();
    }); 

    afterEach(function(){
      registry.get.restore();
    });

    it('should show an error', function(){
      expect(logSpy.log.args[0][0]).to.equal('oc registries not found. Run "oc registry add <registry href>"'.red);
    });
  });

  describe('when registry is passed on command line', function(){
    
    beforeEach(function(){
      sinon.stub(registry, 'get').yields(null, []);
      sinon.stub(registry, 'getRegistryComponentsByRegistry').yields(null, []);
      execute({registry: 'http://www.registry.com'});
    }); 

    afterEach(function(){
      registry.getRegistryComponentsByRegistry.restore();      
      registry.get.restore();
    });

    it('should use the supplied registry', function(){
      expect(registry.get.called).to.equal(false);
    });
  });

  describe('when registry linked to the app', function(){

    beforeEach(function(){
      sinon.stub(registry, 'get').yields(null, ['http://www.registry.com']);
      execute();
    });

    afterEach(function(){
      registry.get.restore();
    });

    it('should show the list of components for given registry', function(){
      sinon.stub(registry, 'getRegistryComponentsByRegistry').yields(null, []);
      expect(logSpy.log.args[0][0]).to.equal('Components available in oc registry: http://www.registry.com'.yellow);
      registry.getRegistryComponentsByRegistry.restore();
    });

    describe('when no components found', function(){

      beforeEach(function(){
        sinon.stub(registry, 'getRegistryComponentsByRegistry').yields(null, []);
        execute();
      });

      afterEach(function(){
        registry.getRegistryComponentsByRegistry.restore();
      });

      it('should show an empty list of components', function(){
        expect(logSpy.log.args[1][0]).not.to.include('http://www.registry.com');
      });
    });

    describe('when components found', function(){

      beforeEach(function(){
        sinon.stub(registry, 'getRegistryComponentsByRegistry').yields(null, [{ 
          name: 'hello', description: 'a description', version: '1.0.0', href: 'http://www.api.com/hello'
        }]);
        execute();
      });

      afterEach(function(){
        registry.getRegistryComponentsByRegistry.restore();
      });

      it('should list the components', function(){
        expect(logSpy.log.args[1][0]).to.include('hello');
        expect(logSpy.log.args[1][0]).to.include('a description');
        expect(logSpy.log.args[1][0]).to.include('1.0.0');
        expect(logSpy.log.args[1][0]).to.include('http://www.api.com/hello');
      });
    });
  });
});