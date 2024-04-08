const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : registry : add', () => {
  const logSpy = {};
  const Registry = require('../../dist/cli/domain/registry').default;
  const registry = Registry();
  const RegistryFacade = require('../../dist/cli/facade/registry-add').default;
  const registryFacade = RegistryFacade({ registry: registry, logger: logSpy });

  const execute = (done) => {
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    registryFacade({}, () => done());
  };

  describe('when adding a not valid registry', () => {
    beforeEach((done) => {
      sinon.stub(registry, 'add').rejects('An error!!!');
      execute(done);
    });

    afterEach(() => {
      registry.add.restore();
    });

    it('should show the error', () => {
      expect(logSpy.err.args[0][0]).to.equal('An error!!!');
    });
  });

  describe('when adding a valid registry', () => {
    beforeEach((done) => {
      sinon.stub(registry, 'add').resolves('ok!');
      execute(done);
    });

    beforeEach(() => {
      registry.add.restore();
    });

    it('should show a confirmation message', () => {
      expect(logSpy.ok.args[0][0]).to.equal('oc registry added');
    });
  });
});
