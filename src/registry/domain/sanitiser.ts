import type { OcParameter } from '../../types';

const sanitise = {
  booleanParameter(variable: string | number | boolean) {
    if (typeof variable === 'string') {
      if (variable === 'true') {
        return true;
      }
      if (variable === 'false') {
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
    }
    if (type === 'number') {
      return sanitise.numberParameter(variable);
    }
    if (type === 'string') {
      return sanitise.stringParameter(variable);
    }

    return variable;
  }
};

const toRemove = ['__ocAcceptLanguage'];

export function sanitiseComponentParameters(
  requestParameters: Record<string, string | number | boolean>,
  expectedParameters: Record<string, OcParameter>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [requestParameterName, requestParameter] of Object.entries(
    requestParameters
  )) {
    if (
      typeof expectedParameters === 'object' &&
      // biome-ignore lint/suspicious/noPrototypeBuiltins: hasOwnProperty is fine
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
