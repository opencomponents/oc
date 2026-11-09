import semver from 'semver';

const latestVersions = new WeakMap<readonly string[], string | undefined>();

export function getLatestVersion(
  availableVersions: readonly string[]
): string | undefined {
  if (latestVersions.has(availableVersions)) {
    return latestVersions.get(availableVersions);
  }

  const latest =
    semver.maxSatisfying(availableVersions, '') ||
    [...availableVersions].sort(semver.rcompare)[0] ||
    undefined;
  latestVersions.set(availableVersions, latest);

  return latest;
}

export function getAvailableVersion(
  requestedVersion: string | undefined,
  availableVersions: string[]
): string | undefined {
  if (!requestedVersion) {
    return getLatestVersion(availableVersions);
  }

  if (availableVersions.includes(requestedVersion)) {
    return requestedVersion;
  }

  return semver.maxSatisfying(availableVersions, requestedVersion) || undefined;
}

export function validateNewVersion(
  requestedVersion: string,
  availableVersions: string[]
): boolean {
  return !availableVersions.includes(requestedVersion);
}
