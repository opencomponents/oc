export default function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;

  return keysA.every(
    (key) =>
      Object.hasOwn(b, key) &&
      isEqual((a as Record<string, unknown>)[key], (b as any)[key])
  );
}
