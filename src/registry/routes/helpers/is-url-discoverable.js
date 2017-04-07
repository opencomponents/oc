'use strict';

var request = require('minimal-request');

module.exports = function(url, callback){
  request({
    url: url,
    headers: { accept: 'text/html' }
  }, function(err, body, details){

    var isHtml = function(){
      return details.response.headers['content-type'].indexOf('text/html') >= 0;
    };

    callback(null, { isDiscoverable: !err && isHtml() });
  });
};
