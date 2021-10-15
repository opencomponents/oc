'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : registry : ls', () => {
  const logSpy = {};
  const Registry = require('../../dist/cli/domain/registry').default;
  const registry = Registry();
  const RegistryFacade = require('../../dist/cli/facade/registry-ls').default;
  const registryFacade = RegistryFacade({ registry: registry, logger: logSpy });

  const execute = function (done) {
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    logSpy.warn = sinon.spy();
    registryFacade({}, () => done());
  };

  describe('when no registries linked to the app', () => {
    beforeEach(done => {
      sinon.stub(registry, 'get').resolves([]);
      execute(done);
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
    beforeEach(done => {
      sinon
        .stub(registry, 'get')
        .resolves([
          'http://www.registry.com',
          'https://www.anotherregistry.com'
        ]);
      execute(done);
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
