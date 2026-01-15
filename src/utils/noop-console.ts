/**
 * Creates a no-op console object that silently discards all logging calls.
 * Useful as a default console implementation when component logging is disabled.
 *
 * @returns Console object with all methods mapped to no-op functions
 */
export function createNoopConsole(): Partial<Console> {
  const noop = () => {};
  return Object.fromEntries(Object.keys(console).map((key) => [key, noop]));
}

export default createNoopConsole;
