'use strict';

const format = require('stringformat');
const _ = require('lodash');

const strings = require('../../../resources');

const validateParameter = function(parameter, expectedType) {
  const expected = expectedType.toLowerCase();

  if (expected === 'boolean') {
    return _.isBoolean(parameter);
  } else if (expected === 'number') {
    return _.isNumber(parameter);
  } else if (expected === 'string') {
    return _.isString(parameter);
  }

  return false;
};

module.exports = function(requestParameters, expectedParameters) {
  const result = { isValid: true, errors: {} },
    mandatoryParameters = [];

  _.forEach(
    expectedParameters,
    (expectedParameter, expectedParameterName) => {
      if (expectedParameter.mandatory) {
        mandatoryParameters.push(expectedParameterName);
      }
    },
    this
  );

  _.forEach(
    mandatoryParameters,
    mandatoryParameterName => {
      if (!_.has(requestParameters, mandatoryParameterName)) {
        if (!result.errors.mandatory) {
          result.errors.mandatory = {};
          result.isValid = false;
        }

        result.errors.mandatory[mandatoryParameterName] =
          strings.errors.registry.MANDATORY_PARAMETER_MISSING_CODE;
      }
    },
    this
  );

  _.forEach(
    requestParameters,
    (requestParameter, requestParameterName) => {
      if (_.has(expectedParameters, requestParameterName)) {
        const expectedType = expectedParameters[requestParameterName].type;

        if (!validateParameter(requestParameter, expectedType)) {
          if (!result.errors.types) {
            result.errors.types = {};
            result.isValid = false;
          }

          result.errors.types[requestParameterName] =
            strings.errors.registry.PARAMETER_WRONG_FORMAT_CODE;
        }
      }
    },
    this
  );

  result.errors.message = (function() {
    let errorString = '';

    if (_.keys(result.errors.mandatory).length > 0) {
      const missingParams = _.map(
        result.errors.mandatory,
        (mandatoryParameter, mandatoryParameterName) =>
          mandatoryParameterName + ', '
      )
        .join('')
        .slice(0, -2);

      errorString += format(
        strings.errors.registry.MANDATORY_PARAMETER_MISSING,
        missingParams
      );
    }

    if (_.keys(result.errors.types).length > 0) {
      if (errorString.length > 0) {
        errorString += '; ';
      }

      const badParams = _.map(
        result.errors.types,
        (parameter, parameterName) => parameterName + ', '
      )
        .join('')
        .slice(0, -2);

      errorString += format(
        strings.errors.registry.PARAMETER_WRONG_FORMAT,
        badParams
      );
    }
    return errorString;
  })();

  return result;
};
