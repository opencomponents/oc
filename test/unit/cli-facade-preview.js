'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : facade : preview', () => {
  let openSpy, logSpy, registryStub;

  const execute = function (error, url, done) {
    openSpy = sinon.spy();
    registryStub = {
      getComponentPreviewUrlByUrl: error
        ? sinon.stub().rejects(error)
        : sinon.stub().resolves(url)
    };
    logSpy = { err: sinon.spy() };

    const PreviewFacade = injectr('../../dist/cli/facade/preview.js', {
        open: openSpy
      }).default,
      previewFacade = PreviewFacade({
        logger: logSpy,
        registry: registryStub
      });

    previewFacade({ componentHref: 'http://components.com/component' }, () =>
      done()
    );
  };

  describe('when previewing not valid component', () => {
    beforeEach(done => {
      execute('404!!!', {}, done);
    });

    it('should not open any preview', () => {
      expect(openSpy.called).to.be.false;
    });

    it('should show error message', () => {
      expect(logSpy.err.args[0][0]).to.equal(
        "The specified path is not a valid component's url"
      );
    });
  });

  describe('when previewing valid component', () => {
    beforeEach(done => {
      execute(null, 'http://registry.com/component/~preview/', done);
    });

    it('should open /component/~preview/', () => {
      expect(openSpy.args[0][0]).to.equal(
        'http://registry.com/component/~preview/'
      );
    });
  });
});
