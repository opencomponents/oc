'use strict';

var express = require('express');
var settings = require('../../resources/settings');
var _ = require('underscore');

module.exports = function(input){
  var options = _.clone(input);

  if(!options.publishAuth){
    options.beforePublish = function(req, res, next){ next(); };
  } else {
    options.beforePublish = express.basicAuth(options.publishAuth.username, options.publishAuth.password);
  }

  if(!options.prefix){
    options.prefix = '/';
  }

  if(!options.tempDir){
    options.tempDir = settings.registry.defaultTempPath;
  }

  return options;
};