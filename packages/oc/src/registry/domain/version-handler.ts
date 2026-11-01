import semver from 'semver';

export function getAvailableVersion(
  requestedVersion: string | undefined,
  availableVersions: string[]
): string | undefined {
  if (!requestedVersion) {
    return (
      semver.maxSatisfying(availableVersions, '') ||
      [...availableVersions].sort(semver.rcompare)[0] ||
      undefined
    );
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
