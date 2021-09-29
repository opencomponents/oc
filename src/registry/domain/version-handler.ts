import semver from 'semver';
import semverExtra from 'semver-extra';

export function getAvailableVersion(
  requestedVersion: string | undefined,
  availableVersions: string[]
) {
  if (typeof requestedVersion === 'undefined') {
    requestedVersion = '';
  }

  const version =
    semver.maxSatisfying(availableVersions, requestedVersion) || undefined;
  const max = semverExtra.max(availableVersions);
  const isLatest = requestedVersion === '';

  return version || (isLatest && max) || undefined;
}

export function validateNewVersion(
  requestedVersion: string,
  availableVersions: string[]
) {
  return !availableVersions.includes(requestedVersion);
}
