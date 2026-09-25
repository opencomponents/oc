import semver from 'semver';
import semverExtra from 'semver-extra';

// Memoized semver resolution (registry-performance-improvements.md item 9).
//
// `repository.getComponent` calls `getAvailableVersion` on every render, and
// the unversioned/ranged paths re-run `semver.maxSatisfying` over the whole
// versions list each time. The versions arrays are replaced — never mutated —
// on publish/poll refresh, so the array reference itself is the invalidation
// token: each distinct array gets its own Map<requested, resolved> and stale
// entries are garbage-collected along with the old array. No manual
// invalidation is needed. Cache access is fail-open: anything unexpected
// falls through to the uncached resolver below.
const resolutionCache = new WeakMap<
  string[],
  Map<string, string | undefined>
>();

function resolveVersion(
  requestedVersion: string | undefined,
  availableVersions: string[]
): string | undefined {
  if (!requestedVersion) {
    return (
      semver.maxSatisfying(availableVersions, '') ||
      semverExtra.max(availableVersions) ||
      undefined
    );
  }

  if (availableVersions.includes(requestedVersion)) {
    return requestedVersion;
  }

  return semver.maxSatisfying(availableVersions, requestedVersion) || undefined;
}

export function getAvailableVersion(
  requestedVersion: string | undefined,
  availableVersions: string[]
): string | undefined {
  // Falsy requests (undefined, '') share one entry: they take the same branch.
  const cacheKey = requestedVersion || '';
  let cached: Map<string, string | undefined> | undefined;
  try {
    if (!Array.isArray(availableVersions)) {
      return resolveVersion(requestedVersion, availableVersions);
    }
    cached = resolutionCache.get(availableVersions);
    if (cached?.has(cacheKey)) {
      return cached.get(cacheKey);
    }
  } catch {
    return resolveVersion(requestedVersion, availableVersions);
  }

  const resolved = resolveVersion(requestedVersion, availableVersions);

  try {
    if (!cached) {
      cached = new Map<string, string | undefined>();
      resolutionCache.set(availableVersions, cached);
    }
    cached.set(cacheKey, resolved);
  } catch {
    // Fail-open: a cache write must never break version resolution.
  }

  return resolved;
}

export function validateNewVersion(
  requestedVersion: string,
  availableVersions: string[]
): boolean {
  return !availableVersions.includes(requestedVersion);
}
