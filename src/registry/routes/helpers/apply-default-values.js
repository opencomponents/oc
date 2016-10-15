'use strict';

var _ = require('underscore');

module.exports = function(requestParameters, expectedParameters) {
  var result = _.clone(requestParameters);
  var optionalParametersWithDefaults = _.pick(expectedParameters, function(parameter){
    return !parameter.mandatory && parameter.default;
  });
  
  _.forEach(optionalParametersWithDefaults, function(expectedParameter, expectedParameterName){
    if(!_.has(requestParameters, expectedParameterName)) {
      result[expectedParameterName] = expectedParameter.default;
    }
  });

  return result;
};