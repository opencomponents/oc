'use strict';

var _ = require('underscore');

module.exports = function(options){

  var eventData = {
    headers: options.headers,
    name: options.name,
    parameters: options.parameters,
    requestVersion: options.version || ''
  };
    
  var start = process.hrtime();

  return {
    extend: function(obj){
      eventData = _.extend(eventData, obj);
    },
    getData: function(){

      var delta = process.hrtime(start),
          nanosec = delta[0] * 1e9 + delta[1];

      eventData.duration = nanosec / 1e3;

      return eventData;
    }
  };
};