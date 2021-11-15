import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import Mocha from 'mocha';
import minimist from 'minimist';
import { promisify } from 'util';

import * as oc from '../src';
import log from './logger';

const mocha = new Mocha({ timeout: 20000 });
const argv = minimist(process.argv.slice(2), { boolean: 'silent' });
const componentsFixturesPath = './test/fixtures/components';
const testDirs = [
  'test/unit/**/*.js',
  'test/integration/**/*.js',
  'test/acceptance/**/*.js'
];
const glb = promisify(glob);

if (argv['silent']) {
  mocha.reporter('progress');
}

const componentsToPackage = fs
  .readdirSync(componentsFixturesPath)
  .filter(x => x !== 'handlebars3-component');

const packageComponent = (componentName: string) =>
  promisify(oc.cli.package)({
    componentPath: path.join(componentsFixturesPath, componentName),
    compress: false
  });

const addTestSuite = async (dir: string) => {
  const files = await glb(path.join(__dirname, '..', dir));
  files.forEach(file => mocha.addFile(file));
};

async function main() {
  for (const componentName of componentsToPackage) {
    await packageComponent(componentName);
  }

  log.complete(`Test components packaged`);

  await Promise.all(testDirs.map(addTestSuite));

  mocha.run(err => process.on('exit', () => process.exit(err)));
}

main().catch(err => {
  log.error(`Error during test components packaging: ${err}`);
  process.exit(1);
});
