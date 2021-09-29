import { Config } from '../../../types';

type ValidationResult =
  | {
      isValid: true;
    }
  | { isValid: false; missing: string[] };

export default function pluginsRequirements(
  componentRequirements: string[],
  registryPlugins: Config['plugins']
): ValidationResult {
  const result = { isValid: true };
  const missing: string[] = [];

  for (const requiredPlugin of componentRequirements || []) {
    if (
      !registryPlugins ||
      !Object.keys(registryPlugins).includes(requiredPlugin)
    ) {
      missing.push(requiredPlugin);
    }
  }

  if (missing.length) {
    return {
      isValid: false,
      missing: missing
    };
  }

  return { isValid: true };
}
