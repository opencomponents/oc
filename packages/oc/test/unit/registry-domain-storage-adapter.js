const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

function mockPromiseAdapter() {
  return {
    adapterApi: 'promise',
    getFile: sinon.stub().resolves('file content'),
    getJson: sinon.stub().resolves({ ok: true }),
    listSubDirectories: sinon.stub().resolves(['1.0.0']),
    putDir: sinon.stub().resolves(['uploaded']),
    putFile: sinon.stub().resolves('uploaded'),
    putFileContent: sinon.stub().resolves('uploaded'),
    removeDir: sinon.stub().resolves(),
    removeFile: sinon.stub().resolves(),
    getUrl: sinon.stub().returns(''),
    isValid: sinon.stub().returns(true),
    maxConcurrentRequests: 20,
    adapterType: 's3'
  };
}

function mockLegacyAdapter(adapterType = 's3') {
  return {
    adapterApi: 'callback',
    getFile: sinon.stub().callsFake((filePath, callback) =>
      callback(null, `file:${filePath}`)
    ),
    getJson: sinon.stub().callsFake((_filePath, callback) =>
      callback(null, { ok: true })
    ),
    listSubDirectories: sinon.stub().yields(null, ['1.0.0']),
    putDir: sinon.stub().yields(null, ['uploaded']),
    putFile: sinon.stub().yields(null, 'uploaded'),
    putFileContent: sinon.stub().yields(null, 'uploaded'),
    removeDir: sinon.stub().yields(null),
    removeFile: sinon.stub().yields(null),
    getUrl: sinon.stub().returns(''),
    isValid: sinon.stub().returns(true),
    maxConcurrentRequests: 20,
    adapterType
  };
}

function getParser() {
  const emitWarning = sinon.stub();
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = emitWarning;
  const parser = injectr('../../dist/registry/domain/storage-adapter.js').default;

  // Restore the process hook after each parser invocation in the test process.
  const restore = () => {
    process.emitWarning = originalEmitWarning;
  };
  return { parser, emitWarning, restore };
}

describe('registry : domain : storage adapter', () => {
  it('returns a native promise adapter unchanged', () => {
    const { parser, emitWarning, restore } = getParser();
    const adapter = mockPromiseAdapter();

    expect(parser(adapter)).to.equal(adapter);
    expect(emitWarning.called).to.be.false;
    restore();
  });

  it('does not misclassify an unmarked promise adapter with optional arguments', async () => {
    const { parser, emitWarning, restore } = getParser();
    const adapter = mockPromiseAdapter();
    delete adapter.adapterApi;
    adapter.getFile = (filePath, _force = false) =>
      Promise.resolve(`file:${filePath}`);

    expect(await parser(adapter).getFile('path')).to.equal('file:path');
    expect(emitWarning.called).to.be.false;
    restore();
  });

  it('converts a callback adapter and preserves all adapter properties', async () => {
    const { parser, emitWarning, restore } = getParser();
    const adapter = mockLegacyAdapter('azure-blob-storage');
    const parsed = parser(adapter);

    expect(parsed).not.to.equal(adapter);
    expect(parsed.adapterType).to.equal('azure-blob-storage');
    expect(parsed.maxConcurrentRequests).to.equal(20);
    expect(parsed.isValid()).to.be.true;
    expect(await parsed.getFile('path')).to.equal('file:path');
    expect(await parsed.getJson('path')).to.eql({ ok: true });
    await parsed.removeDir('components');
    await parsed.removeFile('components/file', true);
    expect(adapter.removeDir.calledOnce).to.be.true;
    expect(adapter.removeFile.calledOnce).to.be.true;
    expect(emitWarning.calledOnce).to.be.true;
    restore();
  });

  it('supports callback compatibility on converted methods', (done) => {
    const { parser, restore } = getParser();
    const adapter = mockLegacyAdapter('gs');
    const parsed = parser(adapter);

    parsed.getFile('path', (error, value) => {
      expect(error).to.equal(null);
      expect(value).to.equal('file:path');
      restore();
      done();
    });
  });

  it('passes callback adapter errors through unchanged', (done) => {
    const { parser, restore } = getParser();
    const error = { code: 'STORAGE_ERROR', message: 'backend failed' };
    const adapter = mockLegacyAdapter('gs');
    adapter.getFile.callsFake((_path, callback) => callback(error));

    parser(adapter).getFile('path').catch((actualError) => {
      expect(actualError).to.equal(error);
      restore();
      done();
    });
  });

  it('warns once per adapter category', () => {
    const { parser, emitWarning, restore } = getParser();

    parser(mockLegacyAdapter());
    parser(mockLegacyAdapter());
    expect(emitWarning.calledOnce).to.be.true;
    expect(emitWarning.args[0][0]).to.contain('oc-s3-storage-adapter');
    expect(emitWarning.args[0][0]).to.contain('1.2.0');
    expect(emitWarning.args[0][1]).to.equal('DeprecationWarning');
    restore();
  });

  it('warns once for custom callback adapters', () => {
    const { parser, emitWarning, restore } = getParser();

    parser(mockLegacyAdapter('custom'));
    parser(mockLegacyAdapter('custom'));

    expect(emitWarning.calledOnce).to.be.true;
    expect(emitWarning.args[0][0]).to.contain('Callback-based storage adapters');
    restore();
  });

});
