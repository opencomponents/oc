'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : registry : remove', () => {
  const logSpy = {},
    Registry = require('../../src/cli/domain/registry'),
    registry = new Registry(),
    RegistryFacade = require('../../src/cli/facade/registry-remove'),
    registryFacade = new RegistryFacade({ registry: registry, logger: logSpy });

  const execute = function() {
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    registryFacade({}, () => {});
  };

  describe('when removing a registry and having some problem removing it', () => {
    beforeEach(() => {
      sinon.stub(registry, 'remove').yields('something bad happened!', null);
      execute();
    });

    afterEach(() => {
      registry.remove.restore();
    });

    it('should show the error', () => {
      expect(logSpy.err.args[0][0]).to.equal('something bad happened!');
    });
  });

  describe('when removing a valid registry', () => {
    beforeEach(() => {
      sinon.stub(registry, 'remove').yields(null, 'ok!');
      execute();
    });

    afterEach(() => {
      registry.remove.restore();
    });

    it('should show a confirmation message', () => {
      expect(logSpy.ok.args[0][0]).to.equal('oc registry deleted');
    });
  });
});
