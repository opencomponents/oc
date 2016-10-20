'use strict';

var express = require('express');
var path = require('path');
var _ = require('underscore');

var baseUrlHandler = require('./base-url-handler');
var cors = require('./cors');
var discoveryHandler = require('./discovery-handler');
var fileUploads = require('./file-uploads');
var requestHandler = require('./request-handler');

module.exports.bind = function(app, options){

  app.set('port', process.env.PORT || options.port);
  app.set('json spaces', 0);

  app.use(function(req, res, next){
    res.conf = options;
    next();
  });

  app.use(requestHandler());
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(cors);
  app.use(fileUploads);
  app.use(baseUrlHandler);
  app.use(discoveryHandler);

  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'jade');
  app.set('view cache', true);

  if(!!options.verbosity){
    app.use(express.logger('dev'));
  }

  if(options.local){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  }

  return app;
};