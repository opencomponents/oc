import path from 'path';
import tryRequire from 'try-require';

export default function moduleExists(moduleName: string): boolean {
  const packageModulePath = path.join(moduleName, 'package.json');

  if (require.cache && !!require.cache[packageModulePath]) {
    delete require.cache[packageModulePath];
  }

  return (
    !!tryRequire.resolve(moduleName) || !!tryRequire.resolve(packageModulePath)
  );
}
