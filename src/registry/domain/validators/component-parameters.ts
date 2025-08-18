import strings from '../../../resources';
import type { OcParameter } from '../../../types';

const validateParameter = (
  parameter: string | number | boolean,
  expectedType: string
): boolean => {
  const expected = expectedType.toLowerCase();

  switch (expected) {
    case 'boolean':
      return typeof parameter === 'boolean';
    case 'number':
      return typeof parameter === 'number';
    case 'string':
      return typeof parameter === 'string';
    default:
      return false;
  }
};

interface ValidationResult {
  isValid: boolean;
  errors: {
    mandatory: Record<string, string>;
    types: Record<string, string>;
    message: string;
  };
}

export default function componentParameters(
  requestParameters: Record<string, string | number | boolean>,
  expectedParameters: Record<string, OcParameter> = {}
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: { mandatory: {}, types: {}, message: '' }
  };
  requestParameters = requestParameters || {};
  expectedParameters = expectedParameters || {};
  const mandatoryParameters: string[] = Object.entries(expectedParameters)
    .filter(([_, expectedParameter]) => expectedParameter.mandatory)
    .map(([expectedParameterName]) => expectedParameterName);

  for (const mandatoryParameterName of mandatoryParameters) {
    if (!(mandatoryParameterName in requestParameters)) {
      result.isValid = false;
      result.errors.mandatory[mandatoryParameterName] =
        strings.errors.registry.MANDATORY_PARAMETER_MISSING_CODE;
    }
  }

  for (const [requestParameterName, requestParameter] of Object.entries(
    requestParameters
  )) {
    if (expectedParameters[requestParameterName]) {
      const expectedType = expectedParameters[requestParameterName].type;

      if (!validateParameter(requestParameter, expectedType)) {
        result.isValid = false;
        result.errors.types[requestParameterName] =
          strings.errors.registry.PARAMETER_WRONG_FORMAT_CODE;
        continue; // Skip enum validation if type validation fails
      }

      const expectedValues = expectedParameters[requestParameterName].enum;
      if (
        expectedValues &&
        !(expectedValues as any).includes(requestParameter)
      ) {
        result.isValid = false;
        result.errors.types[requestParameterName] =
          strings.errors.registry.PARAMETER_WRONG_VALUE(
            requestParameterName,
            expectedValues as string[]
          );
      }
    }
  }

  result.errors.message = (() => {
    let errorString = '';

    if (Object.keys(result.errors.mandatory || {}).length > 0) {
      const missingParams = Object.keys(result.errors.mandatory || {})
        .map((mandatoryParameterName) => mandatoryParameterName + ', ')
        .join('')
        .slice(0, -2);

      errorString +=
        strings.errors.registry.MANDATORY_PARAMETER_MISSING(missingParams);
    }

    if (Object.keys(result.errors.types || {}).length > 0) {
      if (errorString.length > 0) {
        errorString += '; ';
      }

      const badParams = Object.keys(result.errors.types || {})
        .map((parameterName) => parameterName + ', ')
        .join('')
        .slice(0, -2);

      errorString += strings.errors.registry.PARAMETER_WRONG_FORMAT(badParams);
    }
    return errorString;
  })();

  return result;
}
