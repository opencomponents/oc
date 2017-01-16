'use strict';

var _ = require('underscore');

var strings = require('../../../resources');
var auth = require('../authentication');

module.exports = function(conf){

  var response = { isValid: true };

  var returnError = function(message){
    response.isValid = false;
    response.message = message || 'registry configuration is not valid';
    return response;
  };

  if(!conf || !_.isObject(conf) || _.keys(conf).length === 0){
    return returnError(strings.errors.registry.CONFIGURATION_EMPTY);
  }

  var prefix = conf.prefix;

  if(!!prefix){
    if(prefix.substr(0, 1) !== '/'){
      return returnError(strings.errors.registry.CONFIGURATION_PREFIX_DOES_NOT_START_WITH_SLASH);
    }

    if(prefix.substr(prefix.length - 1) !== '/'){
      return returnError(strings.errors.registry.CONFIGURATION_PREFIX_DOES_NOT_END_WITH_SLASH);
    }
  }

  var publishAuth = conf.publishAuth;

  if(!!publishAuth){
    var res = auth.validate(publishAuth);
    if(!res.isValid){
      return returnError(res.message);
    }
  }

  var dependencies = conf.dependencies;

  if(!!dependencies && !_.isArray(dependencies)){
    return returnError(strings.errors.registry.CONFIGURATION_DEPENDENCIES_MUST_BE_ARRAY);
  }

  var routes = conf.routes;

  if(!!routes && !_.isArray(routes)){
    return returnError(strings.errors.registry.CONFIGURATION_ROUTES_MUST_BE_ARRAY);
  } else {
    _.forEach(routes, function(route){
      if(!route.route || !route.handler || !route.method){
        return returnError(strings.errors.registry.CONFIGURATION_ROUTES_NOT_VALID);
      }

      if(!_.isFunction(route.handler)){
        return returnError(strings.errors.registry.CONFIGURATION_ROUTES_HANDLER_MUST_BE_FUNCTION);
      }
    });
  }

  if(!conf.local){
    // S3 settings should either specify both key/secret or 
    // skip both when leveraging IAM Role based S3 access from EC2
    if (!conf.s3 || !conf.s3.bucket || !conf.s3.region ||
      (conf.s3.key && !conf.s3.secret) || (!conf.s3.key && conf.s3.secret)) {
      return returnError(strings.errors.registry.CONFIGURATION_S3_NOT_VALID);
    }
  }

  if (conf.customHeadersToSkipOnWeakVersion) {
    if (!_.isArray(conf.customHeadersToSkipOnWeakVersion)) {
      return returnError(strings.errors.registry.CONFIGURATION_HEADERS_TO_SKIP_MUST_BE_STRING_ARRAY);
    }

    var hasNonStringElements = conf.customHeadersToSkipOnWeakVersion.find(function(element) {
      return typeof(element) !== 'string';
    });

    if (hasNonStringElements) {
      return returnError(strings.errors.registry.CONFIGURATION_HEADERS_TO_SKIP_MUST_BE_STRING_ARRAY);
    }
  }

  return response;
};
