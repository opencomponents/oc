'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : mock', () => {
  const logSpy = {},
    MockFacade = require('../../dist/cli/facade/mock').default,
    Local = require('../../dist/cli/domain/local').default,
    local = Local(),
    mockFacade = MockFacade({ local: local, logger: logSpy });

  const execute = function (done) {
    logSpy.ok = sinon.spy();
    mockFacade(
      { targetType: 'plugin', targetName: 'getValue', targetValue: 'value' },
      () => done()
    );
  };

  describe('when mocking plugin', () => {
    describe('when it succeeds', () => {
      beforeEach(done => {
        sinon.stub(local, 'mock').resolves('ok');
        execute(done);
      });

      afterEach(() => {
        local.mock.restore();
      });

      it('should show a confirmation message', () => {
        expect(logSpy.ok.args[0][0]).to.equal(
          'Mock for plugin has been registered: getValue () => value'
        );
      });
    });
  });
});
