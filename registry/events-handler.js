'use strict';

var RequestInterceptor = require('./middleware/request-interceptor');
var strings = require('../resources/index');
var _ = require('underscore');

module.exports = function(){

  var subscriptions = {};

  return {
    bindEvents: function(app){
      var eventsHandlers = {
        request: function(handlers){
          app.use(new RequestInterceptor(handlers));
        }
      };

      _.forEach(subscriptions, function(callbacks, eventName){
        if(eventsHandlers[eventName]){
          eventsHandlers[eventName](callbacks);
        }
      });
    },
    on: function(eventName, callback){

      if(!_.isFunction(callback)){
        throw(strings.errors.registry.CONFIGURTATION_ONREQUEST_MUST_BE_FUNCTION);
      }

      var self = this;

      if(!subscriptions[eventName]){
        subscriptions[eventName] = [];
      }

      subscriptions[eventName].push(callback);
    }
  };
};