'use strict';

var _ = require('underscore');

var strings = require('../../resources');

var subscriptions = {};

module.exports = {
  fire: function(eventName, eventData){
    if(!!subscriptions[eventName]){
      _.forEach(subscriptions[eventName], function(callback){
        callback(eventData);
      });
    }
  },
  on: function(eventName, callback){
    if(!_.isFunction(callback)){
      throw(strings.errors.registry.CONFIGURATION_ONREQUEST_MUST_BE_FUNCTION);
    }

    if(!subscriptions[eventName]){
      subscriptions[eventName] = [];
    }

    subscriptions[eventName].push(callback);
  },
  reset: function(){
    subscriptions = {};
  }
};