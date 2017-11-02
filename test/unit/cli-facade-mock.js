'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : mock', () => {
  const logSpy = {},
    MockFacade = require('../../src/cli/facade/mock'),
    Local = require('../../src/cli/domain/local'),
    local = new Local(),
    mockFacade = new MockFacade({ local: local, logger: logSpy });

  const execute = function() {
    logSpy.ok = sinon.spy();
    mockFacade(
      { targetType: 'plugin', targetName: 'getValue', targetValue: 'value' },
      () => {}
    );
  };

  describe('when mocking plugin', () => {
    describe('when it succeeds', () => {
      beforeEach(() => {
        sinon.stub(local, 'mock').yields(null, 'ok');
        execute();
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
