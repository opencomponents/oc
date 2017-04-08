'use strict';

const colors = require('colors/safe');
const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : mock', function(){

  const logSpy = {},
    MockFacade = require('../../src/cli/facade/mock'),
    Local = require('../../src/cli/domain/local'),
    local = new Local(),
    mockFacade = new MockFacade({ local: local, logger: logSpy });

  const execute = function(){
    logSpy.log = sinon.spy();
    mockFacade({ targetType: 'plugin', targetName: 'getValue', targetValue: 'value' }, function(){});
  };

  describe('when mocking plugin', function(){

    describe('when it succeeds', function(){

      beforeEach(function(){
        sinon.stub(local, 'mock').yields(null, 'ok');
        execute();
      });

      afterEach(function(){
        local.mock.restore();
      });

      it('should show a confirmation message', function(){
        expect(logSpy.log.args[0][0]).to.equal(colors.green('Mock for plugin has been registered: getValue () => value'));
      });
    });
  });
});
