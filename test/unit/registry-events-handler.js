'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('registry : events-handler', function(){

  var EventsHandler = require('../../registry/events-handler');

  describe('when subscribing a request event using a valid handler', function(){

    var eventsHandler,
        requestHandlerStub = sinon.stub();
    
    before(function(){
      eventsHandler = new EventsHandler();
      eventsHandler.on('request', requestHandlerStub);
    });

    describe('when binding the events to the express app', function(){

      var appStub = {
        use: sinon.stub()
      };

      before(function(){
        eventsHandler.bindEvents(appStub);
      });

      it('should bind the express middleware to the request interceptor', function(){
        expect(appStub.use.called).to.be.true;
        expect(appStub.use.args[0][0]).to.be.a('function');
      });

      it('request handler should have not been called', function(){
        expect(requestHandlerStub.called).to.be.false;
      });
    });
  });

  describe('when subscribing a request event using a not valid handler', function(){

    var eventsHandler = new EventsHandler();

    var execute = function(){
      eventsHandler.on('request', 'this is not a function');
    };

    it('should throw an error', function(){
      expect(execute).to.throw('Registry configuration is not valid: registry.on\'s callback must be a function');
    });
  });

  describe('when not subscribing any request handler', function(){

    var eventsHandler;
    
    before(function(){
      eventsHandler = new EventsHandler();
    });

    describe('when binding the events to the express app', function(){

      var appStub = {
        use: sinon.stub()
      };

      before(function(){
        eventsHandler.bindEvents(appStub);
      });

      it('should not bind the express middleware to the request interceptor', function(){
        expect(appStub.use.called).to.be.false;
      });
    });
  });
});