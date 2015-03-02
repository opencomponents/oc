'use strict';

var now = require('performance-now');
var querystring = require('querystring');

module.exports = function(handler){

  return function(req, res, next){
    req.startTime = now();
    var impl = res.end;

    res.send = function(chunk, encoding) {
      res.send = impl;
      res.send(chunk, encoding);

      var data = {
        duration: parseFloat((now() - req.startTime).toFixed(3)) * 1000,
        headers: req.headers,
        method: req.method,
        path: req.path,
        relativeUrl: req.originalUrl,
        query: req.query,
        url: req.protocol + '://' + req.get('host') + req.originalUrl,
        statusCode: res.statusCode
      };

      if(!!res.errorDetails){
        data.errorDetails = res.errorDetails;
      }
      
      handler(data);
    };

    next();
  };
};