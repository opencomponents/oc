'use strict';

var request = require('minimal-request');
var url = require('url');
var _ = require('underscore');

module.exports = {
  getComponent: function(fallbackRegistryUrl, headers, component, callback) {
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
    }, function(err, res) {
      if(err || !res || res.length === 0) {
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
  componentInfo: function(fallbackRegistryUrl, originalUrl, headers, callback) {
    return request({
      method: 'get',
      url: fallbackRegistryUrl + originalUrl.substr(1, originalUrl.length - 1),
      headers: _.extend({}, headers, {'host': url.parse(fallbackRegistryUrl).host})
    }, callback);
  }
};