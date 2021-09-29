import strings from '../../../resources';
import { OcParameter } from '../../../types';

const validateParameter = function(
  parameter: string | number | boolean,
  expectedType: string
): boolean {
  const expected = expectedType.toLowerCase();

  if (expected === 'boolean') {
    return typeof parameter === 'boolean';
  } else if (expected === 'number') {
    return typeof parameter === 'number';
  } else if (expected === 'string') {
    return typeof parameter === 'string';
  }

  return false;
};

interface ValidationResult {
  isValid: boolean;
  errors: {
    mandatory?: Dictionary<string>;
    types?: Dictionary<string>;
    message?: string;
  };
}

export default function componentParameters(
  requestParameters: Dictionary<string | number | boolean>,
  expectedParameters: Dictionary<OcParameter> = {}
) {
  const result: ValidationResult = { isValid: true, errors: {} };
  const mandatoryParameters: string[] = [];

  for (const [expectedParameterName, expectedParameter] of Object.entries(
    expectedParameters
  )) {
    if (expectedParameter.mandatory) {
      mandatoryParameters.push(expectedParameterName);
    }
  }

  for (const mandatoryParameterName of mandatoryParameters) {
    if (
      typeof requestParameters === 'object' &&
      !requestParameters.hasOwnProperty(mandatoryParameterName)
    ) {
      if (!result.errors.mandatory) {
        result.errors.mandatory = {};
        result.isValid = false;
      }

      result.errors.mandatory[mandatoryParameterName] =
        strings.errors.registry.MANDATORY_PARAMETER_MISSING_CODE;
    }
  }

  for (const [requestParameterName, requestParameter] of Object.entries(
    requestParameters
  )) {
    if (
      typeof expectedParameters === 'object' &&
      expectedParameters.hasOwnProperty(requestParameterName)
    ) {
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
  }

  result.errors.message = (function() {
    let errorString = '';

    if (Object.keys(result.errors.mandatory || {}).length > 0) {
      const missingParams = Object.keys(result.errors.mandatory || {})
        .map(mandatoryParameterName => mandatoryParameterName + ', ')
        .join('')
        .slice(0, -2);

      errorString += strings.errors.registry.MANDATORY_PARAMETER_MISSING(
        missingParams
      );
    }

    if (Object.keys(result.errors.types || {}).length > 0) {
      if (errorString.length > 0) {
        errorString += '; ';
      }

      const badParams = Object.keys(result.errors.types || {})
        .map(parameterName => parameterName + ', ')
        .join('')
        .slice(0, -2);

      errorString += strings.errors.registry.PARAMETER_WRONG_FORMAT(badParams);
    }
    return errorString;
  })();

  return result;
}
