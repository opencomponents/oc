'use strict';

const _ = require('lodash');

const strings = require('../../resources');

let subscriptions = {};

module.exports = {
  fire: function(eventName, eventData) {
    if (subscriptions[eventName]) {
      _.forEach(subscriptions[eventName], callback => {
        callback(eventData);
      });
    }
  },
  on: function(eventName, callback) {
    if (!_.isFunction(callback)) {
      throw strings.errors.registry.CONFIGURATION_ONREQUEST_MUST_BE_FUNCTION;
    }

    if (!subscriptions[eventName]) {
      subscriptions[eventName] = [];
    }

    subscriptions[eventName].push(callback);
  },
  off: function(eventName, callback) {
    if (!_.isFunction(callback)) {
      throw strings.errors.registry.CONFIGURATION_OFFREQUEST_MUST_BE_FUNCTION;
    }

    if (subscriptions[eventName]) {
      _.pull(subscriptions[eventName], callback);
    }
  },
  reset: function() {
    subscriptions = {};
  }
};
