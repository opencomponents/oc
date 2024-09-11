const { rmSync, mkdirSync, writeFileSync, cpSync } = require('node:fs');
const ocClientBrowser = require('oc-client-browser');
const log = require('./logger');
const path = require('node:path');
const packageJson = require('../package');

const ocVersion = packageJson.version;
const clientComponentDir = '../src/components/oc-client/';
const ocClientPackageInfo = require(`${clientComponentDir}package.json`);
const writeJsonSync = (path, data) =>
  writeFileSync(path, JSON.stringify(data, null, 2));

log['start']('Building client');

const srcPath = path.join(__dirname, clientComponentDir, 'src');
rmSync(srcPath, { recursive: true, force: true });
mkdirSync(srcPath);

ocClientBrowser.getLibs((err, libs) => {
  if (err) {
    log['error'](err);
  }
  const { dev, prod } = libs;

  ocClientPackageInfo.version = ocVersion;
  writeJsonSync(
    path.join(__dirname, clientComponentDir, 'package.json'),
    ocClientPackageInfo,
    { spaces: 2 }
  );

  writeFileSync(
    path.join(__dirname, clientComponentDir, 'src/oc-client.min.js'),
    prod
  );
  writeFileSync(
    path.join(__dirname, clientComponentDir, 'src/oc-client.js'),
    dev
  );

  ocClientBrowser.getMap((err, mapContent) => {
    if (err) {
      log['error'](err);
    }
    writeFileSync(
      path.join(__dirname, clientComponentDir, 'src/oc-client.min.map'),
      mapContent
    );

    const Local = require('../dist/cli/domain/local').default;
    const local = Local();
    const packageOptions = {
      componentPath: path.join(__dirname, clientComponentDir),
      production: true,
      verbose: false
    };

    local
      .package(packageOptions)
      .then(() => {
        cpSync(
          path.join(__dirname, clientComponentDir),
          path.join(__dirname, clientComponentDir.replace('src', 'dist')),
          { recursive: true }
        );
        log.complete('Client has been built and packaged');
      })
      .catch((err) => {
        log.error(err);
      });
  });
});
