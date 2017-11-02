'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : registry : ls', () => {
  const logSpy = {},
    Registry = require('../../src/cli/domain/registry'),
    registry = new Registry(),
    RegistryFacade = require('../../src/cli/facade/registry-ls'),
    registryFacade = new RegistryFacade({ registry: registry, logger: logSpy });

  const execute = function() {
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    logSpy.warn = sinon.spy();
    registryFacade({}, () => {});
  };

  describe('when no registries linked to the app', () => {
    beforeEach(() => {
      sinon.stub(registry, 'get').yields(null, []);
      execute();
    });

    afterEach(() => {
      registry.get.restore();
    });

    it('should introduce the list of registries', () => {
      expect(logSpy.warn.args[0][0]).to.equal('oc linked registries:');
    });

    it('should log an error', () => {
      expect(logSpy.err.args[0][0]).to.equal(
        'oc registries not found. Run "oc registry add <registry href>"'
      );
    });
  });

  describe('when registries linked to the app', () => {
    beforeEach(() => {
      sinon
        .stub(registry, 'get')
        .yields(null, [
          'http://www.registry.com',
          'https://www.anotherregistry.com'
        ]);
      execute();
    });

    afterEach(() => {
      registry.get.restore();
    });

    it('should introduce the list of registries', () => {
      expect(logSpy.warn.args[0][0]).to.equal('oc linked registries:');
    });

    it('should list the linked registries', () => {
      expect(logSpy.ok.args[0][0]).to.equal('http://www.registry.com');
      expect(logSpy.ok.args[1][0]).to.equal('https://www.anotherregistry.com');
    });
  });
});
