'use strict';

var _ = require('underscore');

var sanitise = {
  booleanParameter: function(variable){
    if(_.isString(variable)){
      if(variable === 'true'){
        return true;
      } else if(variable === 'false'){
        return false;
      }
    }

    return variable;
  },
  numberParameter: function(variable){
    return variable*1;
  },
  parameter: function(variable, type){
    if(type === 'boolean'){
      return sanitise.booleanParameter(variable);
    } else if(type === 'number'){
      return sanitise.numberParameter(variable);
    }

    return variable;
  }
};

var toRemove = ['__ocAcceptLanguage'];

module.exports = {
  sanitiseComponentParameters: function(requestParameters, expectedParameters){

    var result = {};

    _.forEach(requestParameters, function(requestParameter, requestParameterName){
      if(_.has(expectedParameters, requestParameterName)){
        
        var expectedType = expectedParameters[requestParameterName].type,
            sanitised = sanitise.parameter(requestParameter, expectedType);

        result[requestParameterName] = sanitised;
      } else if(!_.contains(toRemove, requestParameterName)){
        result[requestParameterName] = requestParameter;
      }
    }, this);

    return result;
  }
};