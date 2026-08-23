import strings from '../../../resources';
import type { OcParameter } from '../../../types';

export interface ValidationResult {
  isValid: boolean;
  errors: {
    mandatory: Record<string, string>;
    types: Record<string, string>;
    message: string;
  };
}

export interface CompiledParameterSchema {
  isEmpty: boolean;
  defaults: Array<[string, string | number | boolean]>;
  mandatory: string[];
  types: Record<string, string>;
  enums: Record<string, ReadonlyArray<string | number | boolean>>;
}

const emptyCompiledSchema: CompiledParameterSchema = {
  isEmpty: true,
  defaults: [],
  mandatory: [],
  types: Object.create(null),
  enums: Object.create(null)
};

export function compileParameterSchema(
  expectedParameters?: Record<string, OcParameter> | null
): CompiledParameterSchema {
  if (
    !expectedParameters ||
    typeof expectedParameters !== 'object' ||
    Array.isArray(expectedParameters)
  ) {
    return emptyCompiledSchema;
  }

  const keys = Object.keys(expectedParameters);
  if (keys.length === 0) {
    return emptyCompiledSchema;
  }

  const defaults: Array<[string, string | number | boolean]> = [];
  const mandatory: string[] = [];
  const types: Record<string, string> = Object.create(null);
  const enums: Record<
    string,
    ReadonlyArray<string | number | boolean>
  > = Object.create(null);

  for (const name in expectedParameters) {
    if (!Object.hasOwn(expectedParameters, name)) {
      continue;
    }
    const param = (expectedParameters as Record<string, OcParameter>)[name];
    if (!param || typeof param !== 'object') {
      continue;
    }

    const rawType = (param as OcParameter).type as unknown as string;
    const normalizedType =
      typeof rawType === 'string' ? rawType.toLowerCase() : '';
    types[name] = normalizedType;

    const enumValues = (param as OcParameter).enum;
    if (typeof enumValues !== 'undefined') {
      enums[name] = enumValues as ReadonlyArray<string | number | boolean>;
    }

    if (param.mandatory) {
      mandatory.push(name);
    } else if (typeof param.default !== 'undefined') {
      defaults.push([name, param.default as string | number | boolean]);
    }
  }

  return {
    isEmpty: false,
    defaults,
    mandatory,
    types,
    enums
  };
}

export function processParameters(
  requestParameters:
    | Record<string, string | number | boolean>
    | null
    | undefined,
  compiled: CompiledParameterSchema
): {
  params: Record<string, string | number | boolean>;
  validation: ValidationResult;
} {
  if (compiled.isEmpty) {
    const source = requestParameters as
      | Record<string, string | number | boolean>
      | null
      | undefined;
    if (!source || typeof source !== 'object') {
      return {
        params: {},
        validation: {
          isValid: true,
          errors: { mandatory: {}, types: {}, message: '' }
        }
      };
    }
    const params: Record<string, string | number | boolean> = {};
    for (const key in source) {
      if (!Object.hasOwn(source, key)) {
        continue;
      }
      if (key === '__ocAcceptLanguage') {
        continue;
      }
      params[key] = (source as Record<string, any>)[key];
    }
    return {
      params,
      validation: {
        isValid: true,
        errors: { mandatory: {}, types: {}, message: '' }
      }
    };
  }

  let source: Record<string, any>;
  if (
    requestParameters == null ||
    typeof requestParameters !== 'object' ||
    Array.isArray(requestParameters)
  ) {
    source = {};
  } else {
    source = requestParameters as Record<string, any>;
  }

  const defaults = compiled.defaults;
  for (let i = 0; i < defaults.length; i++) {
    const entry = defaults[i]!;
    const key = entry[0];
    const defVal = entry[1];
    const cur = source[key];
    if (cur === null || cur === undefined) {
      source[key] = defVal;
    }
  }

  const params: Record<string, string | number | boolean> = {};
  let mandatoryErrors: Record<string, string> | null = null;
  let typeErrors: Record<string, string> | null = null;
  let isValid = true;

  const types = compiled.types;
  const enums = compiled.enums;

  for (const key in source) {
    if (!Object.hasOwn(source, key)) {
      continue;
    }
    const isDeclared = Object.hasOwn(types, key);
    if (isDeclared) {
      const rawVal = source[key] as string | number | boolean;
      const type = types[key]!;
      let sanitised: string | number | boolean;

      if (type === 'boolean') {
        if (typeof rawVal === 'string') {
          if (rawVal === 'true') {
            sanitised = true;
          } else if (rawVal === 'false') {
            sanitised = false;
          } else {
            sanitised = rawVal;
          }
        } else {
          sanitised = rawVal;
        }
      } else if (type === 'number') {
        sanitised = Number(rawVal as any);
      } else if (type === 'string') {
        sanitised = rawVal == null ? '' : (rawVal as any);
      } else {
        sanitised = rawVal;
      }

      params[key] = sanitised as string | number | boolean;

      let typeValid: boolean;
      if (type === 'boolean') {
        typeValid = typeof sanitised === 'boolean';
      } else if (type === 'number') {
        typeValid = typeof sanitised === 'number';
      } else if (type === 'string') {
        typeValid = typeof sanitised === 'string';
      } else {
        typeValid = false;
      }

      if (!typeValid) {
        isValid = false;
        if (!typeErrors) {
          typeErrors = {};
        }
        typeErrors[key] = strings.errors.registry.PARAMETER_WRONG_FORMAT_CODE;
        continue;
      }

      const enumVals = enums[key];
      if (enumVals && !(enumVals as any).includes(sanitised)) {
        isValid = false;
        if (!typeErrors) {
          typeErrors = {};
        }
        typeErrors[key] = strings.errors.registry.PARAMETER_WRONG_VALUE(
          key,
          enumVals as unknown as string[]
        );
      }
    } else {
      if (key === '__ocAcceptLanguage') {
        continue;
      }
      params[key] = source[key] as string | number | boolean;
    }
  }

  const mandatory = compiled.mandatory;
  for (let i = 0; i < mandatory.length; i++) {
    const name = mandatory[i]!;
    if (!(name in params)) {
      isValid = false;
      if (!mandatoryErrors) {
        mandatoryErrors = {};
      }
      mandatoryErrors[name] =
        strings.errors.registry.MANDATORY_PARAMETER_MISSING_CODE;
    }
  }

  let message = '';
  if (mandatoryErrors) {
    const keys = Object.keys(mandatoryErrors);
    const joined = keys.join(', ');
    message += strings.errors.registry.MANDATORY_PARAMETER_MISSING(joined);
  }
  if (typeErrors) {
    if (message.length > 0) {
      message += '; ';
    }
    const keys = Object.keys(typeErrors);
    const joined = keys.join(', ');
    message += strings.errors.registry.PARAMETER_WRONG_FORMAT(joined);
  }

  const validation: ValidationResult = {
    isValid,
    errors: {
      mandatory: mandatoryErrors || {},
      types: typeErrors || {},
      message
    }
  };

  return { params, validation };
}

export const __emptyCompiledSchema = emptyCompiledSchema;
