const fs = require('fs-extra');
const log = require('./logger');
const Mocha = require('mocha');
const oc = require('../dist');
const path = require('node:path');

const mocha = new Mocha({ timeout: 20000 });
const silent = process.argv.includes('--silent');
const componentsFixturesPath = './test/fixtures/components';
const testDirs = ['test/unit', 'test/integration', 'test/acceptance'];

if (silent) {
  mocha.reporter('progress');
}

const componentsToPackage = fs
  .readdirSync(componentsFixturesPath)
  .filter((x) => x !== 'handlebars3-component');

const packageComponent = (componentName) =>
  new Promise((resolve, reject) => {
    oc.cli.package(
      {
        componentPath: path.join(componentsFixturesPath, componentName),
        compress: false
      },
      (err) => (err ? reject(err) : resolve())
    );
  });

const addTestSuite = (dir) => {
  const root = path.join(__dirname, '..', dir);
  const files = fs
    .readdirSync(root, { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .sort();
  for (const file of files) {
    mocha.addFile(path.join(root, file));
  }
};

(async () => {
  try {
    for (const componentName of componentsToPackage) {
      await packageComponent(componentName);
    }
    log.complete('Test components packaged');

    testDirs.forEach(addTestSuite);
    mocha.run((err) => process.on('exit', () => process.exit(err)));
  } catch (err) {
    log.error(`Error during test components packaging: ${err}`);
    process.exit(1);
  }
})();
