import { request } from 'undici';
import BoundedCache from '../../../utils/bounded-cache';

export interface DiscoverabilityResult {
  isDiscoverable: boolean;
}

// Memoized per baseUrl. The probe result only changes when deployment
// config changes, so re-probing over HTTP on every HTML info-page request
// is wasted work on the ~info hot path. Bounded (LRU) because a host-based
// baseUrlFunc can produce distinct baseUrls per Host — an unbounded map
// would grow forever. The promise itself is cached so concurrent in-flight
// requests dedupe onto a single probe.
const MAX_DISCOVERABILITY_CACHE_ENTRIES = 100;
const DISCOVERABILITY_CACHE_NAMESPACE = 'discoverability';
const discoverabilityCache = new BoundedCache(
  MAX_DISCOVERABILITY_CACHE_ENTRIES
);

function shouldBypassCache(): boolean {
  const flag = process.env['OC_DISCOVERABILITY_NO_CACHE'];
  return flag === '1' || flag?.toLowerCase() === 'true';
}

async function probeUrlDiscoverability(
  url: string
): Promise<DiscoverabilityResult> {
  try {
    const res = await request(url, { headers: { accept: 'text/html' } });

    const isHtml = !!res.headers['content-type']?.includes('text/html');

    return {
      isDiscoverable: isHtml
    };
  } catch {
    return { isDiscoverable: false };
  }
}

export function clearDiscoverabilityCache(url?: string): void {
  if (url === undefined) {
    discoverabilityCache.clear();
  } else {
    discoverabilityCache.delete(DISCOVERABILITY_CACHE_NAMESPACE, url);
  }
}

export default async function isUrlDiscoverable(
  url: string
): Promise<DiscoverabilityResult> {
  if (!shouldBypassCache()) {
    const cached = discoverabilityCache.get<Promise<DiscoverabilityResult>>(
      DISCOVERABILITY_CACHE_NAMESPACE,
      url
    );
    if (cached) {
      return cached;
    }
  }

  const pending = probeUrlDiscoverability(url);

  if (!shouldBypassCache()) {
    discoverabilityCache.set(DISCOVERABILITY_CACHE_NAMESPACE, url, pending);
    // Don't let a rejection permanently poison the cache entry.
    // (probe currently never rejects, this is defensive.)
    pending.catch(() => {
      if (
        discoverabilityCache.get<Promise<DiscoverabilityResult>>(
          DISCOVERABILITY_CACHE_NAMESPACE,
          url
        ) === pending
      ) {
        discoverabilityCache.delete(DISCOVERABILITY_CACHE_NAMESPACE, url);
      }
    });
  }

  return pending;
}
