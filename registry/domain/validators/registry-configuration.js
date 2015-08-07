'use strict';

var _ = require('underscore');

var strings = require('../../../resources');

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
    if(publishAuth.type !== 'basic'){
      return returnError(strings.errors.registry.CONFIGURATION_PUBLISH_AUTH_NOT_SUPPORTED);
    } else {
      if(!publishAuth.username || !publishAuth.password){
        return returnError(strings.errors.registry.CONFIGURATION_PUBLISH_AUTH_CREDENTIALS_MISSING);
      }
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

  return response;
};