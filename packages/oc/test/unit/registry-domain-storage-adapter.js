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
    removeDir: sinon.stub().yields(),
    removeFile: sinon.stub().yields(),
    getUrl: sinon.stub().returns(''),
    maxConcurrentRequests: 20,
    adapterType: 's3',
    isValid: sinon.stub().returns(true)
  };
}

let process;

function initialiseWithRealAdapter(adapter) {
  process = { emitWarning: sinon.stub() };
  const adapterParser = injectr(
    '../../dist/registry/domain/storage-adapter.js',
    {
      universalify: require('universalify'),
      '../../utils/deprecate': {
        __esModule: true,
        default: ({ subject, replacement }) =>
          process.emitWarning(
            `${subject} is deprecated and will be removed in OpenComponents v1 - use ${replacement} instead.`,
            'DeprecationWarning'
          )
      }
    },
    { process }
  ).default;

  return adapterParser(adapter);
}

function initialise(adapter, warningProcess, deprecate) {
  process = warningProcess || { emitWarning: sinon.stub() };
  deprecate = deprecate || sinon.stub().callsFake(({ id, subject, replacement }) => {
    process.emitWarning(
      `${subject} is deprecated and will be removed in OpenComponents v1 - use ${replacement} instead.`,
      'DeprecationWarning'
    );
    deprecate.ids = deprecate.ids || [];
    deprecate.ids.push(id);
  });
  const adapterParser = injectr(
    '../../dist/registry/domain/storage-adapter.js',
    {
      universalify: { fromCallback: sinon.stub().returns('promisified') },
      '../../utils/deprecate': { __esModule: true, default: deprecate }
    },
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
          'Storage adapter callbacks'
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
      expect(parsed.removeDir).to.be.equal('promisified');
      expect(parsed.removeFile).to.be.equal('promisified');
      expect(parsed.isValid()).to.equal(true);
    });

  it('only warns once for repeated legacy adapter construction', () => {
    const warningProcess = { emitWarning: sinon.stub() };
    const warned = new Set();
    const deprecate = sinon.stub().callsFake(({ id, subject, replacement }) => {
      if (warned.has(id)) {
        return;
      }
      warned.add(id);
      warningProcess.emitWarning(
        `${subject} is deprecated and will be removed in OpenComponents v1 - use ${replacement} instead.`,
        'DeprecationWarning'
      );
    });
    initialise(mockLegacyAdapter(), warningProcess, deprecate);
    initialise(mockLegacyAdapter(), warningProcess, deprecate);

    expect(warningProcess.emitWarning.calledOnce).to.be.true;
    });

  it('preserves callback results through the promise adapter', async () => {
    const adapter = initialiseWithRealAdapter({
      ...mockLegacyAdapter(),
      getFile: sinon.stub().yields(null, 'file contents')
    });

    const result = await adapter.getFile('path');

    expect(result).to.equal('file contents');
  });

  it('preserves the legacy adapter receiver', async () => {
    const legacyAdapter = {
      ...mockLegacyAdapter(),
      prefix: 'stored',
      getFile(filePath, callback) {
        callback(null, `${this.prefix}:${filePath}`);
      },
      getUrl() {
        return this.prefix;
      },
      isValid() {
        return this.prefix === 'stored';
      }
    };
    const adapter = initialiseWithRealAdapter(legacyAdapter);

    expect(await adapter.getFile('path')).to.equal('stored:path');
    expect(adapter.getUrl()).to.equal('stored');
    expect(adapter.isValid()).to.be.true;
  });
});
});
