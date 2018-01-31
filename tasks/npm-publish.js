const fs = require('fs-extra');
const log = require('./logger');
const spawn = require('cross-spawn');

const builtVersion = fs.readJsonSync(
  './src/components/oc-client/_package/package.json'
).version;
const ocVersion = fs.readJsonSync('./package.json').version;

if (builtVersion !== ocVersion) {
  log.fatal(
    `The oc-client built version (${
      builtVersion
    }) doesn't match the npm package version (${ocVersion})`
  );
  process.exit(1);
}

const cmd = spawn('npm', ['publish'], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

cmd.on('error', () => {
  log.fatal('npm publish failed');
});

cmd.on('close', code => {
  if (code === 0) {
    log.complete('npm publish succeded');
  }

  process.exit(code);
});
