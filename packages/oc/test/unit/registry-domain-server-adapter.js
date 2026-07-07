const expect = require('chai').expect;
const sinon = require('sinon');

describe('registry : domain : server-adapter', () => {
  const getHttpServerAdapter =
    require('../../dist/registry/domain/server-adapter').default;

  const createAdapter = () => ({
    native: sinon.stub(),
    listen: sinon.stub(),
    httpServer: sinon.stub()
  });

  describe('when given an adapter factory', () => {
    it('should return the created adapter', () => {
      const adapter = createAdapter();
      const factory = sinon.stub().returns(adapter);
      const options = { custom: true };

      expect(getHttpServerAdapter(factory, options)).to.equal(adapter);
      expect(factory.calledWith(options)).to.be.true;
    });
  });

  describe('when given an adapter instance', () => {
    it('should return the adapter untouched', () => {
      const adapter = createAdapter();

      expect(getHttpServerAdapter(adapter)).to.equal(adapter);
    });
  });

  describe('when the factory returns an invalid adapter', () => {
    it('should throw', () => {
      expect(() => getHttpServerAdapter(() => ({}))).to.throw(
        'Invalid HTTP server adapter'
      );
    });
  });
});
