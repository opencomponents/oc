import semver from 'semver';

export function validateComponentName(componentName: string): boolean {
  return !/[^a-zA-Z0-9\-_]/.test(componentName) && componentName !== '_package';
}

export function validateVersion(version: string): boolean {
  return !!semver.valid(version);
}
