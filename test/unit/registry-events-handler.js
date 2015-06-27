'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('registry : events-handler', function(){

  var EventsHandler = require('../../registry/events-handler');

  describe('when subscribing a request event using a not valid handler', function(){

    var eventsHandler = new EventsHandler();

    var execute = function(){
      eventsHandler.on('request', 'this is not a function');
    };

    it('should throw an error', function(){
      expect(execute).to.throw('Registry configuration is not valid: registry.on\'s callback must be a function');
    });
  });

});