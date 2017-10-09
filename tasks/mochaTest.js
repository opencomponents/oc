'use strict';

const glob = require('glob');
const Mocha = require('mocha');
const minimist = require('minimist');
const path = require('path');

const mocha = new Mocha({ timeout: 20000 });
const argv = minimist(process.argv.slice(2), { boolean: 'silent' });
const testDirs = [
  'test/unit/**/*.js',
  'test/integration/**/*.js',
  'test/acceptance/**/*.js'
];

if (argv.silent) {
  mocha.reporter('progress');
}

// set up files to be tested by mocha
const addTests = function() {
  return new Promise(resolve => {
    testDirs.forEach(dir => {
      glob(path.join(__dirname, '..', dir), (err, files) => {
        files.forEach(file => mocha.addFile(file));
        resolve();
      });
    });
  });
};

addTests().then(() => {
  mocha.run(err => process.on('exit', () => process.exit(err)));
});
