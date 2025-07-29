const { readFileSync } = require('node:fs');
const log = require('./logger');
const packageJson = require('../package');
const minimist = require('minimist');
const path = require('node:path');
const semver = require('semver');

const readJsonSync = (path) => JSON.parse(readFileSync(path, 'utf8'));
const argv = minimist(process.argv.slice(2), {
  string: 'type',
  default: { type: false },
  alias: { t: 'type' }
});

if (
  argv.type &&
  (argv.type === 'patch' || argv.type === 'minor' || argv.type === 'major')
) {
  packageJson.version = semver.inc(packageJson.version, argv.type);
  writeJsonSync(path.join(__dirname, '../package.json'), packageJson, {
    spaces: 2
  });
  log.complete(`Package version upgraded to: ${packageJson.version}`);
} else {
  log.error(
    `Incorrect --type input: ${argv.type}. Use 'patch', 'minor' or 'major'`
  );
}
