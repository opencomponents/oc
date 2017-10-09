'use strict';

const async = require('async');
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

async.each(
  testDirs,
  (dir, next) => {
    glob(path.join(__dirname, '..', dir), (err, files) => {
      files.forEach(file => mocha.addFile(file));
      next();
    });
  },
  () => {
    mocha.run(err => process.on('exit', () => process.exit(err)));
  }
);
