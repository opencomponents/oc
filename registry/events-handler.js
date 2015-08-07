'use strict';

var _ = require('underscore');

var strings = require('../resources/index');

module.exports = function(){

  var subscriptions = {};

  return {
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

      var self = this;

      if(!subscriptions[eventName]){
        subscriptions[eventName] = [];
      }

      subscriptions[eventName].push(callback);
    }
  };
};