'use strict';

var format = require('stringformat');
var semver = require('semver');
var strings = require('../../resources');
var _ = require('underscore');

var validate = {
  booleanParameter: function(booleanParameter){
    return _.isBoolean(booleanParameter);
  },

  numberParameter: function(numberParameter){
    return !!numberParameter && _.isNumber(numberParameter);
  },

  parameter: function(parameter, expectedType){
    var expected = expectedType.toLowerCase();

    if(_.contains(['string', 'boolean', 'number'], expected)){
      return validate[expected + 'Parameter'](parameter);
    }

    return false;
  },

  stringParameter: function(stringParameter){
    return !!stringParameter && _.isString(stringParameter) && stringParameter !== '';
  }
};

module.exports = {
  validateComponentName: function(componentName){
    return !/[^a-zA-Z0-9\-\_]/.test(componentName);
  },
  validateTemplateType: function(templateType){
    return _.contains(['handlebars', 'jade'], templateType);
  },
  validateComponentParameters: function(requestParameters, expectedParameters){

    var result = { isValid: true, errors: {} },
        mandatoryParameters = [];

    _.forEach(expectedParameters, function(expectedParameter, expectedParameterName){
      if(expectedParameter.mandatory){
        mandatoryParameters.push(expectedParameterName);
      }
    }, this);

    _.forEach(mandatoryParameters, function(mandatoryParameterName){
      if(!_.has(requestParameters, mandatoryParameterName)){
        if(!result.errors.mandatory){
          result.errors.mandatory = {};
          result.isValid = false;
        }

        result.errors.mandatory[mandatoryParameterName] = strings.errors.registry.MANDATORY_PARAMETER_MISSING_CODE;
      }
    }, this);

    _.forEach(requestParameters, function(requestParameter, requestParameterName){
      if(_.has(expectedParameters, requestParameterName)){
        
        var expectedType = expectedParameters[requestParameterName].type;

        if(!validate.parameter(requestParameter, expectedType)){
          if(!result.errors.types){
            result.errors.types = {};
            result.isValid = false;
          }

          result.errors.types[requestParameterName] = strings.errors.registry.PARAMETER_WRONG_FORMAT_CODE;
        }
      }
    }, this);

    result.errors.message = (function(){
      var errorString = '';

      if(_.keys(result.errors.mandatory).length > 0){

        var missingParams = _.map(result.errors.mandatory, function(mandatoryParameter, mandatoryParameterName){
          return mandatoryParameterName + ', ';
        }).join('').slice(0, -2);

        errorString += format(strings.errors.registry.MANDATORY_PARAMETER_MISSING, missingParams);
      }

      if(_.keys(result.errors.types).length > 0){
        if(errorString.length > 0){
          errorString += '; ';
        }

        var badParams = _.map(result.errors.types, function(parameter, parameterName){
          return parameterName + ', ';
        }).join('').slice(0, -2);

        errorString += format(strings.errors.registry.PARAMETER_WRONG_FORMAT, badParams);
      } 
      return errorString;
    }());

    return result;
  },
  registryConfiguration: function(conf){

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

    if(!!dependencies && (!_.isObject(dependencies)) || _.isArray(dependencies)){
      return returnError(strings.errors.registry.CONFIGURATION_DEPENDENCIES_MUST_BE_OBJECT);
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

    var onRequest = conf.onRequest;

    if(!!onRequest && !_.isFunction(onRequest)){
      return returnError(strings.errors.registry.CONFIGURTATION_ONREQUEST_MUST_BE_FUNCTION);
    }

    return response;
  },
  validatePackage: function(input){
    var response = {
      isValid: true
    };

    var returnError = function(message){
      response.isValid = false;
      response.message = message || 'uploaded package is not valid';
      return response;
    };

    if(!input || !_.isObject(input) || _.keys(input).length === 0){
      return returnError('empty');
    }

    if(_.keys(input).length !== 1){
      return returnError('not_valid');
    }

    var file = input[_.keys(input)[0]];

    if(file.mimetype !== 'application/octet-stream' || !!file.truncated || file.extension !== 'gz' || file.path.indexOf('.tar.gz') < 0){
      return returnError('not_valid');
    }

    return response;
  },
  validateVersion: function(version){
    return { isValid: !!semver.valid(version) };
  }
};
