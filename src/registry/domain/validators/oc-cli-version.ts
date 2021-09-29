import semver from 'semver';
import fs from 'fs-extra';
import path from 'path';

const packageInfo = fs.readJsonSync(
  path.join(__dirname, '..', '..', '..', '..', 'package.json')
);

type OkResult = { isValid: true };
type ErrorResult = {
  isValid: false;
  error: {
    suggestedVersion: string;
    registryVersion: string;
    cliVersion: string;
    code: string;
  };
};
type Result = OkResult | ErrorResult;

export default function ocCliVersion(userAgent: string): Result {
  const baseError = (
    opts: Partial<ErrorResult['error']> = {}
  ): ErrorResult => ({
    isValid: false,
    error: {
      suggestedVersion: `${semver.major(packageInfo.version)}.${semver.minor(
        packageInfo.version
      )}.X`,
      registryVersion: packageInfo.version,
      cliVersion: '',
      code: '',
      ...opts
    }
  });

  if (!userAgent) {
    return baseError({ code: 'empty' });
  }

  const matchVersion = /oc-cli-([\w|.]+).*/.exec(userAgent);
  if (!matchVersion) {
    return baseError({ code: 'not_valid', cliVersion: 'not_valid' });
  }

  const cliVersion = matchVersion[1];
  if (semver.lt(cliVersion, packageInfo.version)) {
    return baseError({ code: 'old_version', cliVersion });
  }

  return { isValid: true };
}
