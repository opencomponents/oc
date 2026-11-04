import type { OcRequest } from '../domain/http-server/types';

export type DiscoveryResponseKind = 'html' | 'json';

export interface DiscoveryCacheVariant {
  kind: DiscoveryResponseKind;
  baseUrl: string;
  local: boolean;
  state: string;
  meta: string;
  theme: string;
  discoveryApi: boolean;
  discoveryExperimental: boolean;
}

// Maximum number of query variants cached per components generation. Variants
// are bounded in practice (state/meta/theme), the cap only guards against
// hostile query strings (e.g. random `meta` values) growing memory.
const MAX_VARIANTS_PER_GENERATION = 50;

const normaliseQueryValue = (value: unknown): string =>
  typeof value === 'string' ? value : '';

export const getDiscoveryVariant = (
  req: OcRequest,
  baseUrl: string,
  local: boolean,
  discoveryApi: boolean,
  discoveryExperimental: boolean,
  kind: DiscoveryResponseKind
): DiscoveryCacheVariant => ({
  kind,
  baseUrl,
  local,
  // `q` is intentionally excluded: it is unused by the JSON branch and the
  // HTML branch skips the cache whenever `q` is present.
  state: kind === 'json' ? normaliseQueryValue(req.query['state']) : '',
  meta: kind === 'json' ? normaliseQueryValue(req.query['meta']) : '',
  theme: kind === 'html' ? req.cookies?.['oc-theme'] || 'dark' : '',
  discoveryApi,
  discoveryExperimental
});

export const getDiscoveryCacheKey = (variant: DiscoveryCacheVariant): string =>
  JSON.stringify(variant);

interface DiscoveryCacheEntry {
  lastEdit: number;
  body: unknown;
}

export class DiscoveryResponseCache {
  private generation: number | undefined;
  private readonly entries = new Map<string, DiscoveryCacheEntry>();

  get(lastEdit: number, key: string): unknown {
    if (this.generation !== lastEdit) {
      return undefined;
    }

    return this.entries.get(key)?.body;
  }

  set(lastEdit: number, key: string, body: unknown): void {
    if (this.generation !== lastEdit) {
      // `lastEdit` advances on every publish/poll update, so dropping the
      // previous generation is both the invalidation mechanism and the memory
      // bound for stale generations.
      this.generation = lastEdit;
      this.entries.clear();
    } else if (
      this.entries.size >= MAX_VARIANTS_PER_GENERATION &&
      !this.entries.has(key)
    ) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) {
        this.entries.delete(oldest.value);
      }
    }
    this.entries.set(key, { lastEdit, body });
  }
}
