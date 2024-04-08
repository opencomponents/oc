const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

function mockAdapter() {
  return {
    getFile: sinon.stub().resolves(),
    getJson: sinon.stub().resolves(),
    listSubDirectories: sinon.stub().resolves(),
    putDir: sinon.stub().resolves(),
    putFile: sinon.stub().resolves(),
    putFileContent: sinon.stub().resolves(),
    getUrl: sinon.stub().returns(''),
    maxConcurrentRequests: 20,
    adapterType: 's3'
  };
}

function mockLegacyAdapter() {
  return {
    getFile: sinon.stub().yields(),
    getJson: sinon.stub().yields(),
    listSubDirectories: sinon.stub().yields(),
    putDir: sinon.stub().yields(),
    putFile: sinon.stub().yields(),
    putFileContent: sinon.stub().yields(),
    getUrl: sinon.stub().returns(''),
    maxConcurrentRequests: 20,
    adapterType: 's3'
  };
}

let process;

function initialise(adapter) {
  process = { emitWarning: sinon.stub() };
  const adapterParser = injectr(
    '../../dist/registry/domain/storage-adapter.js',
    { universalify: { fromCallback: sinon.stub().returns('promisified') } },
    { process }
  ).default;

  return adapterParser(adapter);
}

describe('registry : domain : adapter', () => {
  describe('when is not a legacy adapter', () => {
    const adapter = mockAdapter();
    const parsed = initialise(adapter);

    it('returns the same adapter', () => {
      expect(parsed).to.be.equal(adapter);
    });
  });

  describe('when is a legacy adapter', () => {
    describe('when is an official adapter', () => {
      it('Shows a deprecation warning asking to upgrade', () => {
        initialise(mockLegacyAdapter());

        expect(process.emitWarning.called).to.be.true;
        expect(process.emitWarning.args[0][0]).to.contain(
          'oc-s3-storage-adapter'
        );
        expect(process.emitWarning.args[0][0]).to.contain('1.2.0');
        expect(process.emitWarning.args[0][1]).to.contain('DeprecationWarning');
      });
    });

    describe('when is not an official adapter', () => {
      it('Shows a deprecation warning about callbacks', () => {
        initialise({
          ...mockLegacyAdapter(),
          adapterType: 'non-official-adapter'
        });
        expect(process.emitWarning.called).to.be.true;
        expect(process.emitWarning.args[0][0]).to.contain(
          'Your adapter is using the old interface of working with callbacks. Consider upgrading it to work with promises, as the previous one will be deprecated.'
        );
        expect(process.emitWarning.args[0][1]).to.contain('DeprecationWarning');
      });
    });

    it('returns a universalified adapter', () => {
      const adapter = mockLegacyAdapter();
      const parsed = initialise(adapter);

      expect(parsed).not.to.be.equal(adapter);
      expect(parsed.getFile).to.be.equal('promisified');
      expect(parsed.getJson).to.be.equal('promisified');
      expect(parsed.listSubDirectories).to.be.equal('promisified');
      expect(parsed.putDir).to.be.equal('promisified');
      expect(parsed.putFile).to.be.equal('promisified');
      expect(parsed.putFileContent).to.be.equal('promisified');
    });
  });
});
