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
  registryPlugins: Config['plugins'] | ReadonlySet<string>
): ValidationResult {
  const missing: string[] = [];
  const requiredPlugins = Array.isArray(componentRequirements)
    ? componentRequirements
    : Object.keys(componentRequirements || {});
  const registryPluginNames =
    registryPlugins instanceof Set
      ? registryPlugins
      : new Set(Object.keys(registryPlugins || {}));

  for (const requiredPlugin of requiredPlugins) {
    if (!registryPluginNames.has(requiredPlugin)) {
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
