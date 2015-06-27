'use strict';
var express = require('express');
var _ = require('underscore');
var settings = require(__BASE + '/resources/settings');
var dependenciesResolver = require('./dependencies-resolver');

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

  if(!!options.dependencies){
    options.dependencies = dependenciesResolver(options);
  }

  return options;
};