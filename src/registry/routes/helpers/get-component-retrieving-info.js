'use strict';

const _ = require('lodash');

module.exports = function(options) {
  let eventData = {
    headers: options.headers,
    name: options.name,
    parameters: options.parameters,
    requestVersion: options.version || ''
  };

  const start = process.hrtime();

  return {
    extend: obj => (eventData = _.extend(eventData, obj)),
    getData: () => {
      const delta = process.hrtime(start);
      const nanosec = delta[0] * 1e9 + delta[1];
      eventData.duration = nanosec / 1e3;
      return eventData;
    }
  };
};
