'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : registry : add', () => {
  const logSpy = {},
    Registry = require('../../src/cli/domain/registry'),
    registry = new Registry(),
    RegistryFacade = require('../../src/cli/facade/registry-add'),
    registryFacade = new RegistryFacade({ registry: registry, logger: logSpy });

  const execute = function() {
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    registryFacade({}, () => {});
  };

  describe('when adding a not valid registry', () => {
    beforeEach(() => {
      sinon.stub(registry, 'add').yields('An error!!!', null);
      execute();
    });

    afterEach(() => {
      registry.add.restore();
    });

    it('should show the error', () => {
      expect(logSpy.err.args[0][0]).to.equal('An error!!!');
    });
  });

  describe('when adding a valid registry', () => {
    beforeEach(() => {
      sinon.stub(registry, 'add').yields(null, 'ok!');
      execute();
    });

    beforeEach(() => {
      registry.add.restore();
    });

    it('should show a confirmation message', () => {
      expect(logSpy.ok.args[0][0]).to.equal('oc registry added');
    });
  });
});
