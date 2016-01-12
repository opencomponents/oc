'use strict';

var express = require('express');

module.exports = function(eventsHandler){
  return express.logger(function(tokens, req, res){

    var data = {
      body: req.body,
      duration: tokens['response-time'](req, res)*1000,
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

    if(!!res.errorCode){
      data.errorCode = res.errorCode;
    }

    eventsHandler.fire('request', data);
  });
};