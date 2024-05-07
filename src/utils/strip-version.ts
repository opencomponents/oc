import path from 'node:path';

export default function stripVersion(dependency: string): string {
  const finalPath = dependency.split('@npm:');
  const parts = path.parse(finalPath[1] || finalPath[0]);
  return path.join(parts.dir, parts.base.split('@')[0]);
}
