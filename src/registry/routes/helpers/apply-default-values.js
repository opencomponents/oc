'use strict';

var _ = require('underscore');

module.exports = function(requestParameters, expectedParameters) {
  var optionalParametersWithDefaults = _.pick(expectedParameters, function(parameter){
    return !(parameter.mandatory || _.isUndefined(parameter.default));
  });
  
  _.forEach(optionalParametersWithDefaults, function(expectedParameter, expectedParameterName){
  	var param = requestParameters[expectedParameterName];
    if(_.isUndefined(param) || _.isNull(param)) {
      requestParameters[expectedParameterName] = expectedParameter.default;
    }
  });

  return requestParameters;
};
