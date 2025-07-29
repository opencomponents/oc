const async = require('async');
const { readdirSync } = require('node:fs');
const glob = require('glob');
const log = require('./logger');
const Mocha = require('mocha');
const minimist = require('minimist');
const oc = require('../dist');
const path = require('node:path');

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

const componentsToPackage = readdirSync(componentsFixturesPath).filter(
  (x) => x !== 'handlebars3-component'
);

const packageComponent = (componentName, done) =>
  oc.cli.package(
    {
      componentPath: path.join(componentsFixturesPath, componentName),
      compress: false
    },
    (err) => done(err)
  );

const addTestSuite = (dir, done) =>
  glob(path.join(__dirname, '..', dir), (err, files) => {
    for (const file of files) {
      mocha.addFile(file);
    }
    done();
  });

async.eachSeries(componentsToPackage, packageComponent, (err) => {
  if (err) {
    log.error(`Error during test components packaging: ${err}`);
    process.exit(1);
  } else {
    log.complete('Test components packaged');
  }

  async.each(testDirs, addTestSuite, () =>
    mocha.run((err) => process.on('exit', () => process.exit(err)))
  );
});
