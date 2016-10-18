'use strict';

var _ = require('underscore');

module.exports = function(requestParameters, expectedParameters) {
  var optionalParametersWithDefaults = _.pick(expectedParameters, function(parameter){
    return !(parameter.mandatory || _.isUndefined(parameter.default));
  });
  
  _.forEach(optionalParametersWithDefaults, function(expectedParameter, expectedParameterName){
    if(!_.has(requestParameters, expectedParameterName)) {
      requestParameters[expectedParameterName] = expectedParameter.default;
    }
  });

  return requestParameters;
};