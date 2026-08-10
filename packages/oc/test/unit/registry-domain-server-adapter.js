const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : domain : server-adapter', () => {
  const deprecate = sinon.stub();
  const emitWarning = sinon.stub();
  const warned = new Set();
  deprecate.callsFake(({ id, subject, replacement }) => {
    if (warned.has(id)) {
      return;
    }
    warned.add(id);
    emitWarning(
      `${subject} is deprecated and will be removed in OpenComponents v1 - use ${replacement} instead.`,
      'DeprecationWarning'
    );
  });
  const getHttpServerAdapter = injectr(
    '../../dist/registry/domain/server-adapter.js',
    { '../../utils/deprecate': { __esModule: true, default: deprecate } }
  ).default;

  const createAdapter = () => ({
    native: sinon.stub(),
    listen: sinon.stub(),
    httpServer: sinon.stub()
  });

  const createPromiseAdapter = () => ({
    ...createAdapter(),
    isListening: sinon.stub(),
    close: sinon.stub(),
    onServerError: sinon.stub(),
    supportsPromiseLifecycle: true
  });

  const createLegacyAdapter = () => {
    const adapter = createPromiseAdapter();
    adapter.supportsPromiseLifecycle = false;
    return adapter;
  };

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

  it('bridges a legacy adapter lifecycle to promises and warns once', async () => {
    deprecate.resetHistory();
    warned.clear();
    emitWarning.resetHistory();
    const adapter = createLegacyAdapter();
    adapter.listen.callsFake((_options, callback) => callback());
    adapter.close.callsFake((callback) => callback());
    const factory = sinon.stub().returns(adapter);

    const parsed = getHttpServerAdapter(factory);

    await parsed.listen({ port: 0, timeout: 1000 });
    await parsed.close();

    expect(adapter.listen.calledOnce).to.be.true;
    expect(adapter.close.calledOnce).to.be.true;
    expect(emitWarning.calledOnce).to.be.true;
  });

  it('does not warn for unmarked promise lifecycle methods', async () => {
    deprecate.resetHistory();
    warned.clear();
    emitWarning.resetHistory();
    const adapter = createPromiseAdapter();
    delete adapter.supportsPromiseLifecycle;
    adapter.listen.resolves();
    adapter.close.resolves();

    const parsed = getHttpServerAdapter(adapter);
    await parsed.listen({ port: 0, timeout: 1000 });
    await parsed.close();

    expect(emitWarning.called).to.be.false;
  });

  it('uses a returned promise when a lifecycle method also calls back', async () => {
    const error = new Error('promise failed');
    const adapter = createLegacyAdapter();
    adapter.listen.callsFake((_options, callback) => {
      callback();
      return Promise.reject(error);
    });
    const parsed = getHttpServerAdapter(adapter);

    let actualError;
    try {
      await parsed.listen({ port: 0, timeout: 1000 });
    } catch (caught) {
      actualError = caught;
    }

    expect(actualError).to.equal(error);
  });

  it('preserves legacy lifecycle callbacks and warns once', (done) => {
    deprecate.resetHistory();
    warned.clear();
    emitWarning.resetHistory();
    const adapter = createLegacyAdapter();
    adapter.listen.callsFake((_options, callback) => callback());
    adapter.close.callsFake((callback) => callback());
    const parsed = getHttpServerAdapter(sinon.stub().returns(adapter));

    parsed.listen({ port: 0, timeout: 1000 }, (listenError) => {
      expect(listenError).to.be.undefined;
      parsed.close((closeError) => {
        expect(closeError).to.be.undefined;
        expect(emitWarning.calledOnce).to.be.true;
        expect(emitWarning.firstCall.args[0]).to.contain(
          'HTTP server adapter callback API'
        );
        done();
      });
    });
  });
});
