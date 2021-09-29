import { OcParameter } from '../../types';

const sanitise = {
  booleanParameter(variable: string | number | boolean) {
    if (typeof variable === 'string') {
      if (variable === 'true') {
        return true;
      } else if (variable === 'false') {
        return false;
      }
    }

    return variable;
  },
  numberParameter(variable: string | number | boolean) {
    return Number(variable);
  },
  stringParameter(variable: string | number | boolean) {
    return variable == null ? '' : variable;
  },
  parameter(variable: string | number | boolean, type: string) {
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

export function sanitiseComponentParameters(
  requestParameters: Dictionary<string | number | boolean>,
  expectedParameters: Dictionary<OcParameter>
): Dictionary<string | number | boolean> {
  const result = {};

  for (const [requestParameterName, requestParameter] of Object.entries(
    requestParameters
  )) {
    if (
      typeof expectedParameters === 'object' &&
      expectedParameters.hasOwnProperty(requestParameterName)
    ) {
      const expectedType = expectedParameters[requestParameterName].type;
      const sanitised = sanitise.parameter(requestParameter, expectedType);

      result[requestParameterName] = sanitised;
    } else if (!toRemove.includes(requestParameterName)) {
      result[requestParameterName] = requestParameter;
    }
  }

  return result;
}
