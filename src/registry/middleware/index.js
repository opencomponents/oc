'use strict';

var bodyParser = require('body-parser');
var errorhandler = require('errorhandler');
var express = require('express');
var morgan = require('morgan');
var path = require('path');
var _ = require('underscore');

var baseUrlHandler = require('./base-url-handler');
var cors = require('./cors');
var discoveryHandler = require('./discovery-handler');
var fileUploads = require('./file-uploads');
var requestHandler = require('./request-handler');

module.exports.bind = function(app, options){

  app.set('port', options.port);
  app.set('json spaces', 0);

  app.use(function(req, res, next){
    res.conf = options;
    next();
  });

  app.use(requestHandler());
  app.use(bodyParser.json({ inflate: true }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cors);
  app.use(fileUploads);
  app.use(baseUrlHandler);
  app.use(discoveryHandler);

  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'jade');
  app.set('view cache', false);

  if(!!options.verbosity){
    app.use(morgan('dev'));
  }

  if(options.local){
    app.use(errorhandler({ dumpExceptions: true, showStack: true }));
  }

  return app;
};