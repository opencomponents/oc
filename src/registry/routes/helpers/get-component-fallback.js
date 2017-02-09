'use strict';

var request = require('minimal-request');
var url = require('url');
var _ = require('underscore');

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
  getComponentInfoOrPreviewFallback: function (conf, req, res, localRegistryError, component, callback) {
    if (!localRegistryError) {
      return callback(null, component);
    }

    if (!conf.fallbackRegistryUrl) {
      return callback({localError: localRegistryError});
    }

    var path = req.originalUrl;
    return request({
      method: 'get',
      url: conf.fallbackRegistryUrl + path.substr(1, path.length - 1),
      headers: _.extend({}, req.headers, {
        'host': url.parse(conf.fallbackRegistryUrl).host,
        'accept': 'application/json'
      })
    }, function (fallbackErr, fallbackResponse) {
      if (fallbackErr === 304) {
        return res.status(304).send('');
      }

      if (fallbackErr) {
        return callback({localError: localRegistryError, fallbackError: fallbackErr});
      }

      try {
        return callback(null, JSON.parse(fallbackResponse));
      } catch (parseError) {
        return callback({localError: localRegistryError, fallbackError: 'Could not parse fallback response: ' + fallbackResponse});
      }
    });
  }
};
