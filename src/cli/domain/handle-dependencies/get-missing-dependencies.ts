import path from 'path';
import moduleExists from '../../../utils/module-exists';

export default function getMissingDependencies(
  dependencies: Record<string, string> = {}
) {
  const missing: string[] = [];

  Object.entries(dependencies).forEach(([dependency, version]) => {
    const pathToModule = path.resolve('node_modules/', dependency);
    if (!moduleExists(pathToModule)) {
      missing.push(`${dependency}@${version || 'latest'}`);
    }
  });

  return missing;
}
