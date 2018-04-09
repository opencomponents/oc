'use strict';

const request = require('minimal-request');

module.exports = function(url, callback) {
  request(
    {
      url,
      headers: { accept: 'text/html' }
    },
    (err, body, details) => {
      const isHtml = () =>
        details.response.headers['content-type'].indexOf('text/html') >= 0;

      callback(null, { isDiscoverable: !err && isHtml() });
    }
  );
};
