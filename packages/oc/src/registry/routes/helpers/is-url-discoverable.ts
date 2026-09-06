import { request } from 'undici';

export interface DiscoverabilityResult {
  isDiscoverable: boolean;
}

// Memoized per baseUrl for process lifetime. The probe result only changes
// when deployment config changes, so re-probing over HTTP on every HTML
// info-page request is wasted work on the ~info hot path. The promise itself
// is cached so concurrent in-flight requests dedupe onto a single probe.
const discoverabilityCache = new Map<string, Promise<DiscoverabilityResult>>();

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
    discoverabilityCache.delete(url);
  }
}

export default async function isUrlDiscoverable(
  url: string
): Promise<DiscoverabilityResult> {
  if (!shouldBypassCache()) {
    const cached = discoverabilityCache.get(url);
    if (cached) {
      return cached;
    }
  }

  const pending = probeUrlDiscoverability(url);

  if (!shouldBypassCache()) {
    discoverabilityCache.set(url, pending);
    // Don't let a rejection permanently poison the cache entry.
    // (probe currently never rejects, this is defensive.)
    pending.catch(() => {
      if (discoverabilityCache.get(url) === pending) {
        discoverabilityCache.delete(url);
      }
    });
  }

  return pending;
}
