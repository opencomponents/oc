import type { Config } from '../../../types';

type ValidationResult =
  | {
      isValid: true;
    }
  | { isValid: false; missing: string[] };

export default function pluginsRequirements(
  componentRequirements:
    | Record<string, (...args: unknown[]) => unknown>
    | string[]
    | null
    | undefined,
  registryPlugins: Config['plugins']
): ValidationResult {
  const missing: string[] = [];
  const requiredPlugins = Array.isArray(componentRequirements)
    ? componentRequirements
    : Object.keys(componentRequirements || {});

  for (const requiredPlugin of requiredPlugins) {
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
