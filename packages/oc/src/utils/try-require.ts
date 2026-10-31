function resolve(id: string): string | undefined {
  try {
    return require.resolve(id);
  } catch {
    return undefined;
  }
}

function tryRequire<T = any>(id: string): T | undefined {
  const resolved = resolve(id);
  return resolved ? require(resolved) : undefined;
}

tryRequire.resolve = resolve;

export default tryRequire;
