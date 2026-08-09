const { expect } = require('chai');
const injectr = require('injectr');
const sinon = require('sinon');

const getParser = () => {
  const emitWarning = sinon.stub();
  const parser = injectr(
    '../../dist/registry/domain/metadata-adapter.js',
    {
      '../../utils/deprecate': {
        __esModule: true,
        default: ({ id, subject, replacement }) =>
          emitWarning(
            `${id}: ${subject} is deprecated; use ${replacement}`,
            'DeprecationWarning'
          )
      }
    }
  ).default;

  return { parser, emitWarning };
};

const createPromiseStore = () => ({
  adapterApi: 'promise',
  adapterType: 'test-metadata',
  isValid: sinon.stub().returns(true),
  initialise: sinon.stub().resolves(),
  getAllComponents: sinon.stub().resolves([]),
  addVersion: sinon.stub().resolves(),
  reserveVersion: sinon.stub().resolves({ token: 'token' }),
  commitVersion: sinon.stub().resolves(),
  abortVersion: sinon.stub().resolves(),
  close: sinon.stub().resolves()
});

const createLegacyStore = () => ({
  adapterApi: 'callback',
  adapterType: 'legacy-metadata',
  isValid: sinon.stub().returns(true),
  initialise: sinon.stub().yields(null),
  getAllComponents: sinon.stub().yields(null, []),
  addVersion: sinon.stub().yields(null),
  reserveVersion: sinon.stub().yields(null, { token: 'token' }),
  commitVersion: sinon.stub().yields(null),
  abortVersion: sinon.stub().yields(null),
  close: sinon.stub().yields(null)
});

const createUnmarkedPromiseStore = () => {
  const store = createPromiseStore();
  delete store.adapterApi;
  return store;
};

const createUnmarkedRestCallbackStore = () => ({
  adapterType: 'legacy-rest-metadata',
  isValid: sinon.stub().returns(true),
  initialise: (...args) => args.at(-1)(null),
  getAllComponents: (...args) => args.at(-1)(null, []),
  addVersion: (...args) => args.at(-1)(null),
  reserveVersion: (...args) => args.at(-1)(null, { token: 'token' }),
  commitVersion: (...args) => args.at(-1)(null),
  abortVersion: (...args) => args.at(-1)(null)
});

describe('registry : domain : metadata adapter', () => {
  it('returns a promise metadata store unchanged', () => {
    const { parser, emitWarning } = getParser();
    const store = createPromiseStore();

    expect(parser(store)).to.equal(store);
    expect(emitWarning.called).to.be.false;
  });

  it('supports unmarked promise stores', async () => {
    const { parser, emitWarning } = getParser();

    expect(await parser(createUnmarkedPromiseStore()).getAllComponents()).to.eql(
      []
    );
    expect(emitWarning.called).to.be.false;
  });

  it('converts callback methods to promise methods and preserves errors', async () => {
    const { parser, emitWarning } = getParser();
    const store = createLegacyStore();
    const parsed = parser(store);

    await parsed.initialise();
    expect(await parsed.getAllComponents()).to.eql([]);
    expect(await parsed.reserveVersion({
      name: 'hello-world',
      version: '1.0.0',
      publishDate: 1
    })).to.eql({ token: 'token' });
    expect(emitWarning.calledOnce).to.be.true;

    const error = { code: 'METADATA_ERROR' };
    store.getAllComponents.resetBehavior();
    store.getAllComponents.callsFake((callback) => callback(error));
    let actualError;
    try {
      await parsed.getAllComponents();
    } catch (caughtError) {
      actualError = caughtError;
    }
    expect(actualError).to.equal(error);
  });

  it('supports callback compatibility on the normalized store', (done) => {
    const { parser } = getParser();
    const parsed = parser(createLegacyStore());

    parsed.getAllComponents((error, rows) => {
      expect(error).to.equal(null);
      expect(rows).to.eql([]);
      done();
    });
  });

  it('supports unmarked callback stores with rest-parameter methods', async () => {
    const { parser, emitWarning } = getParser();
    const parsed = parser(createUnmarkedRestCallbackStore());

    expect(await parsed.getAllComponents()).to.eql([]);
    expect(emitWarning.calledOnce).to.be.true;
  });
});
