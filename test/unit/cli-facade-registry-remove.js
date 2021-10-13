'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : registry : remove', () => {
  const logSpy = {},
    Registry = require('../../dist/cli/domain/registry').default,
    registry = Registry(),
    RegistryFacade = require('../../dist/cli/facade/registry-remove'),
    registryFacade = RegistryFacade({ registry: registry, logger: logSpy });

  const execute = function (done) {
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    registryFacade({}, () => done());
  };

  describe('when removing a registry and having some problem removing it', () => {
    beforeEach(done => {
      sinon
        .stub(registry, 'remove')
        .rejects(new Error('something bad happened!'));
      execute(done);
    });

    afterEach(() => {
      registry.remove.restore();
    });

    it('should show the error', () => {
      expect(logSpy.err.args[0][0]).to.equal('Error: something bad happened!');
    });
  });

  describe('when removing a valid registry', () => {
    beforeEach(done => {
      sinon.stub(registry, 'remove').resolves('ok!');
      execute(done);
    });

    afterEach(() => {
      registry.remove.restore();
    });

    it('should show a confirmation message', () => {
      expect(logSpy.ok.args[0][0]).to.equal('oc registry deleted');
    });
  });
});
