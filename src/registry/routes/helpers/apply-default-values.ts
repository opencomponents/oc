import { OcParameter } from '../../../types';

export default function applyDefaultValues(
  requestParameters: Dictionary<string | number | boolean> = {},
  expectedParameters: Dictionary<OcParameter> = {}
): Dictionary<string | number | boolean> {
  const optionalParametersWithDefaults = Object.entries(
    expectedParameters
  ).filter(([, p]) => !p.mandatory && typeof p.default !== 'undefined');

  optionalParametersWithDefaults.forEach(
    ([expectedParameterName, expectedParameter]) => {
      const param = requestParameters[expectedParameterName];
      if (param === null || param === undefined) {
        requestParameters[expectedParameterName] = expectedParameter.default!;
      }
    }
  );

  return requestParameters;
}
