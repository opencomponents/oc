const warned = new Set<string>();

interface DeprecationNotice {
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
  if (warned.has(id)) {
    return;
  }

  warned.add(id);

  process.emitWarning(
    `${subject} is deprecated and will be removed in OpenComponents v1 - use ${replacement} instead.`,
    'DeprecationWarning'
  );
}
