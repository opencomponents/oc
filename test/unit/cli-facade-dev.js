'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : dev', () => {
  const logSpy = {};
  const DevFacade = require('../../dist/cli/facade/dev');
  const Local = require('../../dist/cli/domain/local').default;
  const local = Local();
  const devFacade = DevFacade({ local, logger: logSpy });

  const execute = function (done) {
    logSpy.err = sinon.spy();
    logSpy.warn = () => {};
    devFacade({}, () => done());
  };

  describe('when running a dev version of the registry', () => {
    describe('when the directory is not found', () => {
      beforeEach(done => {
        sinon.stub(local, 'getComponentsByDir').resolves([]);
        execute(done);
      });

      afterEach(() => local.getComponentsByDir.restore());

      it('should show an error', () => {
        expect(logSpy.err.args[0][0]).to.equal(
          'An error happened when initialising the dev runner: no components found in specified path'
        );
      });
    });

    describe('when the directory does not contain any valid component', () => {
      beforeEach(done => {
        sinon.stub(local, 'getComponentsByDir').resolves([]);
        execute(done);
      });

      afterEach(() => local.getComponentsByDir.restore());

      it('should show an error', () => {
        expect(logSpy.err.args[0][0]).to.equal(
          'An error happened when initialising the dev runner: no components found in specified path'
        );
      });
    });
  });
});
