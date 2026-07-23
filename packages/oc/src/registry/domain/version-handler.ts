import semver from 'semver';
import semverExtra from 'semver-extra';

export function getAvailableVersion(
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

export function validateNewVersion(
  requestedVersion: string,
  availableVersions: string[]
): boolean {
  return !availableVersions.includes(requestedVersion);
}
