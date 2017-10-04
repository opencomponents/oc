'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : dev', () => {
  const logSpy = {},
    DevFacade = require('../../src/cli/facade/dev'),
    Local = require('../../src/cli/domain/local'),
    local = new Local(),
    devFacade = new DevFacade({ local, logger: logSpy });

  const execute = function(dirName, port) {
    logSpy.err = sinon.spy();
    logSpy.warn = () => {};
    devFacade({ dirName, port }, () => {});
  };

  describe('when running a dev version of the registry', () => {
    describe('when the directory is not found', () => {
      beforeEach(() => {
        sinon.stub(local, 'getComponentsByDir').yields(null, []);
        execute();
      });

      afterEach(() => local.getComponentsByDir.restore());

      it('should show an error', () => {
        expect(logSpy.err.args[0][0]).to.equal(
          'An error happened when initialising the dev runner: no components found in specified path'
        );
      });
    });

    describe('when the directory does not contain any valid component', () => {
      beforeEach(() => {
        sinon.stub(local, 'getComponentsByDir').yields(null, []);
        execute();
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
