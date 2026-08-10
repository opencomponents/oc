const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const initialise = () => {
  const warned = new Set();
  const emitWarning = sinon.stub();
  const deprecate = sinon.stub().callsFake(({ id, subject, replacement }) => {
    if (!warned.has(id)) {
      warned.add(id);
      emitWarning(
        `${subject} is deprecated and will be removed in OpenComponents v1 - use ${replacement} instead.`,
        'DeprecationWarning'
      );
    }
  });
  const getPromiseBasedMetadataAdapter = injectr(
    '../../dist/registry/domain/metadata-adapter.js',
    { '../../utils/deprecate': { __esModule: true, default: deprecate } }
  ).default;

  return { deprecate, emitWarning, getPromiseBasedMetadataAdapter };
};

describe('registry : domain : metadata-adapter', () => {
  it('preserves promise methods without warning', async () => {
    const { deprecate, getPromiseBasedMetadataAdapter } = initialise();
    const adapter = {
      adapterType: 'test-metadata',
      isValid: () => true,
      initialise: sinon.stub().resolves(),
      getAllComponents: sinon.stub().resolves([]),
      addVersion: sinon.stub().resolves(),
      reserveVersion: sinon.stub().resolves({ token: 'token' }),
      commitVersion: sinon.stub().resolves(),
      abortVersion: sinon.stub().resolves()
    };

    const parsed = getPromiseBasedMetadataAdapter(adapter);

    await parsed.initialise();
    expect(deprecate.called).to.be.false;
  });

  it('bridges callback methods and warns once while preserving results', async () => {
    const { emitWarning, getPromiseBasedMetadataAdapter } = initialise();
    const adapter = {
      adapterType: 'legacy-metadata',
      isValid: () => true,
      initialise: sinon.stub().yields(null),
      getAllComponents: sinon.stub().yields(null, [{ name: 'hello' }]),
      addVersion: sinon.stub().yields(null),
      reserveVersion: sinon.stub().yields(null, { token: 'token' }),
      commitVersion: sinon.stub().yields(null),
      abortVersion: sinon.stub().yields(null)
    };

    const parsed = getPromiseBasedMetadataAdapter(adapter);
    const callback = sinon.spy();

    await parsed.initialise(callback);
    const rows = await parsed.getAllComponents();
    const reservation = await parsed.reserveVersion({ name: 'hello' });

    expect(callback.calledOnceWithExactly(null, undefined)).to.be.true;
    expect(rows).to.eql([{ name: 'hello' }]);
    expect(reservation).to.eql({ token: 'token' });
    expect(emitWarning.calledOnce).to.be.true;
    expect(emitWarning.firstCall.args[0]).to.contain(
      'Metadata adapter callbacks'
    );
  });

  it('bridges callback errors and rejects the promise', async () => {
    const { getPromiseBasedMetadataAdapter } = initialise();
    const error = new Error('metadata failed');
    const adapter = {
      adapterType: 'legacy-metadata',
      isValid: () => true,
      initialise: sinon.stub().yields(error),
      getAllComponents: sinon.stub(),
      addVersion: sinon.stub(),
      reserveVersion: sinon.stub(),
      commitVersion: sinon.stub(),
      abortVersion: sinon.stub()
    };

    let result;
    try {
      await getPromiseBasedMetadataAdapter(adapter).initialise();
    } catch (caught) {
      result = caught;
    }

    expect(result).to.equal(error);
  });
});
