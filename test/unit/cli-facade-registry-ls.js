'use strict';

const colors = require('colors/safe');
const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : registry : ls', function(){

  let logSpy = {},
      Registry = require('../../src/cli/domain/registry'),
      registry = new Registry(),
      RegistryFacade = require('../../src/cli/facade/registry-ls'),
      registryFacade = new RegistryFacade({ registry: registry, logger: logSpy });

  const execute = function(){
    logSpy.log = sinon.spy();
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
      expect(logSpy.log.args[0][0]).to.equal(colors.yellow('oc linked registries:'));
    });

    it('should log an error', function(){
      expect(logSpy.log.args[1][0]).to.equal(colors.red('oc registries not found. Run "oc registry add <registry href>"'));
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
      expect(logSpy.log.args[0][0]).to.equal(colors.yellow('oc linked registries:'));
    });

    it('should list the linked registries', function(){
      expect(logSpy.log.args[1][0]).to.equal(colors.green('http://www.registry.com'));
      expect(logSpy.log.args[2][0]).to.equal(colors.green('https://www.anotherregistry.com'));
    });
  });
});