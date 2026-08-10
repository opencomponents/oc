const warningStoreKey = Symbol.for('opencomponents.deprecation-warnings');
const processWithWarningStore = process as typeof process & {
  [key: symbol]: unknown;
};
let warned = processWithWarningStore[warningStoreKey] as
  | Set<string>
  | undefined;
if (!warned) {
  warned = new Set<string>();
  processWithWarningStore[warningStoreKey] = warned;
}
const warnedSet = warned;

export interface DeprecationNotice {
  /** Stable identifier used to only warn once per process for this deprecation. */
  id: string;
  /** The option/API being removed. */
  subject: string;
  /** What to use instead. */
  replacement: string;
}

/**
 * Emits a single, consistent deprecation notice (once per process, per `id`)
 * for a config option or API that will be removed in OpenComponents v1.
 *
 * Routes through `process.emitWarning` with type `DeprecationWarning`, so it
 * honors the standard Node.js opt-out mechanisms (`--no-deprecation`, etc.)
 * without needing a bespoke env var.
 *
 * This never changes runtime behavior - it is purely informational.
 */
export default function deprecate({
  id,
  subject,
  replacement
}: DeprecationNotice): void {
  if (warnedSet.has(id)) {
    return;
  }

  warnedSet.add(id);

  process.emitWarning(
    `${subject} is deprecated and will be removed in OpenComponents v1 - use ${replacement} instead.`,
    'DeprecationWarning'
  );
}
