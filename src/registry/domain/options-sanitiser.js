'use strict';

var express = require('express');
var _ = require('underscore');

var dependenciesResolver = require('./dependencies-resolver');
var settings = require('../../resources/settings');
var auth = require('./authentication');

module.exports = function(input){
  var options = _.clone(input);

  if(!options.publishAuth){
    options.beforePublish = function(req, res, next){ next(); };
  } else {
    options.beforePublish = auth.middleware(options.publishAuth);
  }

  if(!options.publishValidation){
    options.publishValidation = function(){
      return { isValid: true };
    };
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

  if(!_.isBoolean(options.hotReloading)){
    options.hotReloading = !!options.local;
  }

  return options;
};
