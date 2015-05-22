'use strict';

var colors = require('colors');
var consoleMock = require('../mocks/console');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : mock', function(){

  var MockFacade = require('../../cli/facade/mock'),
      Local = require('../../cli/domain/local'),
      local = new Local(),
      mockFacade = new MockFacade({ local: local, logger: consoleMock }),
      logs;

  var execute = function(){
    consoleMock.reset();
    mockFacade({ targetType: 'plugin', targetName: 'getValue', targetValue: 'value' });
    logs = consoleMock.get();
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
        expect(logs[0]).to.equal('Mock for plugin has been registered: getValue () => value'.green);
      });
    });
  });
});