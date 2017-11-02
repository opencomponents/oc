'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('registry : domain : events-handler', () => {
  const eventsHandler = require('../../src/registry/domain/events-handler');

  describe('when requiring it multiple times', () => {
    const spy = sinon.spy();
    let handler2;

    before(() => {
      eventsHandler.on('eventName', spy);
      handler2 = require('../../src/registry/domain/events-handler');
      handler2.fire('eventName', { a: 1234 });
    });

    after(() => {
      eventsHandler.reset();
    });

    it('should be a singleton', () => {
      expect(spy.called).to.be.true;
    });
  });

  describe('when firing an event that has multiple subscribers', () => {
    const spy = sinon.spy();
    let c = 0;

    before(() => {
      eventsHandler.on('fire', payload => {
        spy(++c, payload);
      });
      eventsHandler.on('fire', payload => {
        spy(++c, payload);
      });
      eventsHandler.fire('fire', { hello: true });
    });

    after(() => {
      eventsHandler.reset();
    });

    it('should call the subscribers in the correct order', () => {
      expect(spy.args[0][0]).to.equal(1);
      expect(spy.args[1][0]).to.equal(2);
    });

    it('should call the subscribers with the event payload', () => {
      expect(spy.args[0][1]).to.eql({ hello: true });
      expect(spy.args[1][1]).to.eql({ hello: true });
    });
  });

  describe('when subscribing a request event using a not valid handler', () => {
    const execute = function() {
      eventsHandler.on('request', 'this is not a function');
    };

    it('should throw an error', () => {
      expect(execute).to.throw(
        "Registry configuration is not valid: registry.on's callback must be a function"
      );
    });
  });
});
