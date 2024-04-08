import path from 'node:path';
import moduleExists from '../../../utils/module-exists';

export default function getMissingDependencies(
  dependencies: Record<string, string> = {}
): string[] {
  const missing: string[] = [];

  for (const [dependency, version] of Object.entries(dependencies)) {
    const pathToModule = path.resolve('node_modules/', dependency);
    if (!moduleExists(pathToModule)) {
      missing.push(`${dependency}@${version || 'latest'}`);
    }
  }

  return missing;
}
