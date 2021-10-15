'use strict';

const fs = require('fs-extra');
const ocClientBrowser = require('oc-client-browser');
const log = require('./logger');
const path = require('path');
const packageJson = require('../package');

const ocVersion = packageJson.version;
const clientComponentDir = '../src/components/oc-client/';
const ocClientPackageInfo = require(`${clientComponentDir}package.json`);

log['start']('Building client');

fs.emptyDirSync(path.join(__dirname, clientComponentDir, 'src'));

ocClientBrowser.getLib((err, libContent) => {
  if (err) {
    log['error'](err);
  }

  ocClientPackageInfo.version = ocVersion;
  fs.writeJsonSync(
    path.join(__dirname, clientComponentDir, 'package.json'),
    ocClientPackageInfo,
    { spaces: 2 }
  );

  fs.writeFileSync(
    path.join(__dirname, clientComponentDir, 'src/oc-client.min.js'),
    libContent
  );

  ocClientBrowser.getMap((err, mapContent) => {
    if (err) {
      log['error'](err);
    }
    fs.writeFileSync(
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
        fs.copySync(
          path.join(__dirname, clientComponentDir),
          path.join(__dirname, clientComponentDir.replace('src', 'dist'))
        );
        log.complete('Client has been built and packaged');
      })
      .catch(err => {
        log.error(err);
      });
  });
});
