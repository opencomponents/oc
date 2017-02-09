'use strict';

var request = require('minimal-request');
var url = require('url');
var _ = require('underscore');

function respondWithError(res, err, fallbackErr) {
  res.errorDetails = err;
  res.errorCode = 'NOT_FOUND';
  return res.status(404).json({err: err, fallbackErr: fallbackErr});
}

function getComponentInfoOrPreviewFallback(fallbackRegistryUrl, originalUrl, headers, callback) {
  return request({
    method: 'get',
    url: fallbackRegistryUrl + originalUrl.substr(1, originalUrl.length - 1),
    headers: _.extend({}, headers, {
      'host': url.parse(fallbackRegistryUrl).host,
      'accept': 'application/json'
    })
  }, callback);
}

module.exports = {
  getComponent: function (fallbackRegistryUrl, headers, component, callback) {
    return request({
      method: 'post',
      url: fallbackRegistryUrl,
      headers: _.extend({}, headers, {'host': url.parse(fallbackRegistryUrl).host}),
      json: true,
      body: {
        components: [
          component
        ]
      }
    }, function (err, res) {
      if (err || !res || res.length === 0) {
        return callback({
          status: 404,
          response: {
            code: 'NOT_FOUND',
            error: err
          }
        });
      }

      return callback(res[0]);
    });
  },
  handleGetComponentFromLocalRepositoryError: function (conf, req, res, err, component, callback) {
    if (!err) {
      return callback(null, component);
    }

    if (!conf.fallbackRegistryUrl) {
      return respondWithError(res, err);
    }

    return getComponentInfoOrPreviewFallback(
      conf.fallbackRegistryUrl,
      req.originalUrl,
      req.headers,
      function (fallbackErr, fallbackResponse) {
        if (fallbackErr === 304) {
          return res.status(304).send('');
        }

        if (fallbackErr) {
          return respondWithError(res, err, fallbackErr);
        }

        try {
          return callback(null, JSON.parse(fallbackResponse));
        } catch (parseError) {
          return respondWithError(res, err, 'Could not parse fallback response: ' + fallbackResponse);
        }
      });
  }
};
