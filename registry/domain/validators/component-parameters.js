'use strict';

var format = require('stringformat');
var _ = require('underscore');

var strings = require('../../../resources');

var validate = {
  booleanParameter: function(booleanParameter){
    return _.isBoolean(booleanParameter);
  },

  numberParameter: function(numberParameter){
    return _.isNumber(numberParameter);
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

module.exports = function(requestParameters, expectedParameters){

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
};