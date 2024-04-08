import semver from 'semver';
import fs from 'fs-extra';
import path from 'node:path';

const packageInfo = fs.readJsonSync(
  path.join(__dirname, '..', '..', '..', '..', 'package.json')
);

type OkResult = { isValid: true };
type ErrorResult = {
  isValid: false;
  error: {
    suggestedVersion: string;
    registryNodeVersion: string;
    cliNodeVersion: string;
    code: string;
  };
};
type Result = OkResult | ErrorResult;

export default function nodeVersion(
  userAgent: string | undefined,
  nodeVersion: string
): Result {
  const baseError = (
    opts: Partial<ErrorResult['error']> = {}
  ): ErrorResult => ({
    isValid: false,
    error: {
      suggestedVersion: packageInfo.engines.node || '*',
      registryNodeVersion: nodeVersion,
      cliNodeVersion: '',
      code: '',
      ...opts
    }
  });

  if (!userAgent) {
    return baseError({ code: 'empty' });
  }

  const matchVersion = /.*\/v([\w|.]+)-.*/.exec(userAgent);
  if (!matchVersion) {
    return baseError({
      code: 'not_valid',
      cliNodeVersion: 'not-valid'
    });
  }

  const cliNodeVersion = matchVersion[1];
  if (!semver.satisfies(cliNodeVersion, packageInfo.engines.node)) {
    return baseError({
      code: 'not_matching',
      cliNodeVersion
    });
  }

  return { isValid: true };
}
