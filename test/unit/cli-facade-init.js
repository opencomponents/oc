'use strict';

var colors = require('colors');
var consoleMock = require('../mocks/console');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : init', function(){

  var InitFacade = require('../../cli/facade/init'),
      Local = require('../../cli/domain/local'),
      local = new Local(),
      initFacade = new InitFacade({ local: local, logger: consoleMock }),
      logs;

  var execute = function(componentName){
    consoleMock.reset();
    initFacade({ componentName: componentName });
    logs = consoleMock.get();
  };

  describe('when initialising a new component', function(){

    describe('when the component is an empty string', function(){

      beforeEach(function(){
        execute(' ');
      });

      it('should show an error', function(){
        expect(logs[0]).to.equal('An error happened when initialising the component: the name is not valid'.red);
      });
    });

    describe('when an error happens', function(){

      beforeEach(function(){
        sinon.stub(local, 'init').yields('nope!');
        execute('the-best-component');
      });

      afterEach(function(){
        local.init.restore();
      });

      it('should show an error', function(){
        expect(logs[0]).to.equal('An error happened when initialising the component: nope!'.red);
      });
    });

    describe('when succeeds', function(){

      beforeEach(function(){
        sinon.stub(local, 'init').yields(null, 'yes man');
        execute('the-best-component');
      });

      afterEach(function(){
        local.init.restore();
      });

      it('should show a message', function(){
        expect(logs[0]).to.equal('Component "the-best-component" created'.green);
      });
    });
  });
});