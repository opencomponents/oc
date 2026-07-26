const fs = require('fs-extra');
const glob = require('glob');
const log = require('./logger');
const Mocha = require('mocha');
const minimist = require('minimist');
const oc = require('../dist');
const path = require('node:path');
const { promisify } = require('node:util');

const mocha = new Mocha({ timeout: 20000 });
const argv = minimist(process.argv.slice(2), { boolean: 'silent' });
const componentsFixturesPath = './test/fixtures/components';
const testDirs = [
  'test/unit/**/*.js',
  'test/integration/**/*.js',
  'test/acceptance/**/*.js'
];

if (argv.silent) {
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

const globAsync = promisify(glob);

const addTestSuite = async (dir) => {
  const files = await globAsync(path.join(__dirname, '..', dir));
  for (const file of files) {
    mocha.addFile(file);
  }
};

(async () => {
  try {
    for (const componentName of componentsToPackage) {
      await packageComponent(componentName);
    }
    log.complete('Test components packaged');

    await Promise.all(testDirs.map(addTestSuite));
    mocha.run((err) => process.on('exit', () => process.exit(err)));
  } catch (err) {
    log.error(`Error during test components packaging: ${err}`);
    process.exit(1);
  }
})();
