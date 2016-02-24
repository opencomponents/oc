'use strict';

var colors = require('colors/safe');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : mock', function(){

  var logSpy = {},
      MockFacade = require('../../cli/facade/mock'),
      Local = require('../../cli/domain/local'),
      local = new Local({ logger: { log: function(){}}}),
      mockFacade = new MockFacade({ local: local, logger: logSpy });

  var execute = function(){
    logSpy.log = sinon.spy();
    mockFacade({ targetType: 'plugin', targetName: 'getValue', targetValue: 'value' });
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
