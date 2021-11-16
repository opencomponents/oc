import fs from 'fs-extra';
import ocClientBrowser from 'oc-client-browser';
import log from './logger';
import path from 'path';
import Local from '../src/cli/domain/local';

const packageJson = fs.readJsonSync(path.join(__dirname, '..', 'package.json'));

const ocVersion = packageJson.version;
const clientComponentDir = '../src/components/oc-client/';
const ocClientPackageInfo = fs.readJsonSync(
  path.join(__dirname, clientComponentDir, 'package.json')
);

log['start']('Building client');

fs.emptyDirSync(path.join(__dirname, clientComponentDir, 'src'));

ocClientBrowser.getLib((err, libContent) => {
  if (err) {
    log['error'](String(err));
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
      log['error'](String(err));
    }
    fs.writeFileSync(
      path.join(__dirname, clientComponentDir, 'src/oc-client.min.map'),
      mapContent
    );

    const local = Local();
    const packageOptions = {
      componentPath: path.join(__dirname, clientComponentDir),
      production: true,
      verbose: false
    };

    local.package(packageOptions, err => {
      fs.copySync(
        path.join(__dirname, clientComponentDir),
        path.join(__dirname, clientComponentDir.replace('src', 'dist'))
      );
      log[err ? 'error' : 'complete'](
        err ? String(err) : 'Client has been built and packaged'
      );
    });
  });
});
