'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('registry : events-handler', function(){

  var eventsHandler = require('../../src/registry/domain/events-handler');

  describe('when requiring it multiple times', function(){

    var spy = sinon.spy(),
      handler2;

    before(function(){
      eventsHandler.on('eventName', spy);
      handler2 = require('../../src/registry/domain/events-handler');
      handler2.fire('eventName', { a: 1234 });
    });

    after(function(){
      eventsHandler.reset();
    });

    it('should be a singleton', function(){
      expect(spy.called).to.be.true;
    });
  });

  describe('when firing an event that has multiple subscribers', function(){

    var spy = sinon.spy(),
      c = 0;

    before(function(){
      eventsHandler.on('fire', function(payload){ spy(++c, payload); });
      eventsHandler.on('fire', function(payload){ spy(++c, payload); });
      eventsHandler.fire('fire', { hello: true });
    });

    after(function(){
      eventsHandler.reset();
    });

    it('should call the subscribers in the correct order', function(){
      expect(spy.args[0][0]).to.equal(1);
      expect(spy.args[1][0]).to.equal(2);
    });

    it('should call the subscribers with the event payload', function(){
      expect(spy.args[0][1]).to.eql({ hello: true });
      expect(spy.args[1][1]).to.eql({ hello: true });
    });
  });

  describe('when subscribing a request event using a not valid handler', function(){

    var execute = function(){
      eventsHandler.on('request', 'this is not a function');
    };

    it('should throw an error', function(){
      expect(execute).to.throw('Registry configuration is not valid: registry.on\'s callback must be a function');
    });
  });

});