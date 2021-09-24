import path from 'path';

export default function stripVersion(dependency: string): string {
  const parts = path.parse(dependency);
  return path.join(parts.dir, parts.base.split('@')[0]);
}
