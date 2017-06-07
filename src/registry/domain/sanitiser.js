'use strict';

const _ = require('lodash');

const sanitise = {
  booleanParameter: function(variable) {
    if (_.isString(variable)) {
      if (variable === 'true') {
        return true;
      } else if (variable === 'false') {
        return false;
      }
    }

    return variable;
  },
  numberParameter: function(variable) {
    return variable * 1;
  },
  stringParameter: function(variable) {
    return _.isNull(variable) ? '' : variable;
  },
  parameter: function(variable, type) {
    if (type === 'boolean') {
      return sanitise.booleanParameter(variable);
    } else if (type === 'number') {
      return sanitise.numberParameter(variable);
    } else if (type === 'string') {
      return sanitise.stringParameter(variable);
    }

    return variable;
  }
};

const toRemove = ['__ocAcceptLanguage'];

module.exports = {
  sanitiseComponentParameters: function(requestParameters, expectedParameters) {
    const result = {};

    _.forEach(
      requestParameters,
      (requestParameter, requestParameterName) => {
        if (_.has(expectedParameters, requestParameterName)) {
          const expectedType = expectedParameters[requestParameterName].type,
            sanitised = sanitise.parameter(requestParameter, expectedType);

          result[requestParameterName] = sanitised;
        } else if (!_.includes(toRemove, requestParameterName)) {
          result[requestParameterName] = requestParameter;
        }
      },
      this
    );

    return result;
  }
};
