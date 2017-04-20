'use strict';

const _ = require('lodash');

const settings = require('../../resources/settings');
const auth = require('./authentication');

module.exports = function(input){
  const options = _.clone(input);

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

  if(!_.isBoolean(options.hotReloading)){
    options.hotReloading = !!options.local;
  }

  if(_.isUndefined(options.verbosity)){
    options.verbosity = 0;
  }

  if(!_.isUndefined(options.fallbackRegistryUrl) &&
    _.last(options.fallbackRegistryUrl) !== '/'){
    options.fallbackRegistryUrl += '/';
  }

  options.customHeadersToSkipOnWeakVersion = (options.customHeadersToSkipOnWeakVersion || [])
    .map((s) => s.toLowerCase());

  options.port = process.env.PORT || options.port;

  return options;
};
