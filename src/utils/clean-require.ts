import tryRequire from 'try-require';

export default function cleanRequire(
  path: string,
  opts: { justTry: true; resolve: true }
): string | undefined;
export default function cleanRequire(
  path: string,
  opts: { justTry?: false; resolve: true }
): string;
export default function cleanRequire<T = unknown>(
  path: string,
  opts: { justTry: true; resolve?: false }
): T | undefined;
export default function cleanRequire<T = unknown>(
  path: string,
  opts: { justTry?: false; resolve?: false }
): T;
export default function cleanRequire(
  path: string,
  { justTry = false, resolve = false }: { justTry?: boolean; resolve?: boolean }
) {
  const shouldThrow = !justTry;

  if (require.cache && !!require.cache[path]) {
    delete require.cache[path];
  }

  let action = shouldThrow ? require : tryRequire;
  if (resolve) {
    action = action.resolve;
  }

  return action(path);
}
