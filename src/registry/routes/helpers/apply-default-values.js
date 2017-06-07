'use strict';

const _ = require('lodash');

module.exports = function(requestParameters, expectedParameters) {
  const optionalParametersWithDefaults = _.pickBy(
    expectedParameters,
    parameter => !(parameter.mandatory || _.isUndefined(parameter.default))
  );

  _.forEach(
    optionalParametersWithDefaults,
    (expectedParameter, expectedParameterName) => {
      const param = requestParameters[expectedParameterName];
      if (_.isUndefined(param) || _.isNull(param)) {
        requestParameters[expectedParameterName] = expectedParameter.default;
      }
    }
  );

  return requestParameters;
};
