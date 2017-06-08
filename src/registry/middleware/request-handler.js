'use strict';

const responseTime = require('response-time');

const eventsHandler = require('../domain/events-handler');

module.exports = function() {
  return responseTime((req, res, time) => {
    const data = {
      body: req.body,
      duration: parseInt(time * 1000, 10),
      headers: req.headers,
      method: req.method,
      path: req.path,
      relativeUrl: req.originalUrl,
      query: req.query,
      url: req.protocol + '://' + req.get('host') + req.originalUrl,
      statusCode: res.statusCode
    };

    if (res.errorDetails) {
      data.errorDetails = res.errorDetails;
    }

    if (res.errorCode) {
      data.errorCode = res.errorCode;
    }

    eventsHandler.fire('request', data);
  });
};
