import fs from 'fs-extra';
import log from './logger';
import minimist from 'minimist';
import path from 'path';
import semver from 'semver';

const packageJson = fs.readJsonSync('../package.json');

const argv = minimist(process.argv.slice(2), {
  string: 'type',
  default: { type: false },
  alias: { t: 'type' }
});

if (
  argv['type'] &&
  (argv['type'] === 'patch' ||
    argv['type'] === 'minor' ||
    argv['type'] === 'major')
) {
  packageJson.version = semver.inc(packageJson.version, argv['type']);
  fs.writeJsonSync(path.join(__dirname, '../package.json'), packageJson, {
    spaces: 2
  });
  log.complete(`Package version upgraded to: ${packageJson.version}`);
} else {
  log.error(
    `Incorrect --type input: ${argv['type']}. Use 'patch', 'minor' or 'major'`
  );
}
