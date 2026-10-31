const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { compile, compileSync } = require('./tasks/compile');

const distDir = 'dist';
const clientDevLibFileName = 'oc-client.js';
const clientLibFileName = 'oc-client.min.js';
const clientMapFileName = 'oc-client.min.map';
const version = require('./package.json').version;

const fromPromise = (fn) =>
  Object.defineProperty(
    function (...args) {
      const cb = args[args.length - 1];
      if (typeof cb !== 'function') return fn.apply(this, args);
      args.pop();
      fn.apply(this, args).then((r) => cb(null, r), cb);
    },
    'name',
    { value: fn.name }
  );

function getLib() {
  return readFile(path.join(__dirname, distDir, clientLibFileName), 'utf-8');
}

async function getLibs() {
  const [dev, prod] = await Promise.all([
    readFile(path.join(__dirname, distDir, clientDevLibFileName), 'utf-8'),
    readFile(path.join(__dirname, distDir, clientLibFileName), 'utf-8')
  ]);

  return { dev, prod };
}

function getMap() {
  return readFile(path.join(__dirname, distDir, clientMapFileName), 'utf8');
}

module.exports = {
  compile: fromPromise(compile),
  compileSync,
  getLib: fromPromise(getLib),
  getLibs: fromPromise(getLibs),
  getMap: fromPromise(getMap),
  version
};
