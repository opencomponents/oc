const expect = require('chai').expect;
const sinon = require('sinon');

describe('registry : domain : http-server : express-adapter', () => {
  const createAdapter =
    require('../../dist/registry/domain/http-server/express-adapter').default;

  const options = { port: 0, timeout: 120000 };

  it('supports promise-based listen and close', async () => {
    const adapter = createAdapter();

    await adapter.listen(options);
    expect(adapter.isListening()).to.equal(true);

    await adapter.close();
    expect(adapter.isListening()).to.equal(false);
  });

  it('preserves callback-based listen and close with a deprecation warning', (done) => {
    const emitWarning = sinon.stub(process, 'emitWarning');
    const adapter = createAdapter();

    adapter.listen(options, (listenError) => {
      expect(listenError).to.equal(undefined);
      expect(adapter.isListening()).to.equal(true);

      adapter.close((closeError) => {
        expect(closeError).to.equal(undefined);
        expect(adapter.isListening()).to.equal(false);
        expect(emitWarning.calledOnce).to.equal(true);
        expect(emitWarning.firstCall.args[0]).to.contain(
          'HTTP server adapter callback API'
        );
        expect(emitWarning.firstCall.args[1]).to.equal('DeprecationWarning');
        emitWarning.restore();
        done();
      });
    });
  });
});
