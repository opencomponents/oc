import path from 'node:path';
import fs from 'fs-extra';
import semver from 'semver';

const packageInfo = fs.readJsonSync(
  path.join(__dirname, '..', '..', '..', '..', 'package.json')
);

type OkResult = { isValid: true };
type ErrorResult = {
  isValid: false;
  error: {
    registryVersion: string;
    minOcVersion: string;
    code: string;
  };
};
type Result = OkResult | ErrorResult;

export default function templateOcVersion(minOcVersion: string): Result {
  if (semver.lt(packageInfo.version, minOcVersion)) {
    return {
      isValid: false,
      error: {
        registryVersion: packageInfo.version,
        minOcVersion,
        code: 'old_version'
      }
    };
  }

  return { isValid: true };
}
