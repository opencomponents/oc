const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getFileInfo } = require('../dist');

const scenarios = [
  {
    path: '/path/file.js',
    gzip: false,
    ext: '.js',
    mime: 'application/javascript'
  },
  {
    path: '/path/file.js.gz',
    gzip: true,
    ext: '.js',
    mime: 'application/javascript'
  },
  { path: 'path/file.css.gz', gzip: true, ext: '.css', mime: 'text/css' },
  {
    path: 'path/file.heisenberg',
    gzip: false,
    ext: '.heisenberg',
    mime: undefined
  }
];

for (const scenario of scenarios) {
  test(`test ${scenario.ext} extension`, () => {
    const fileInfo = getFileInfo(scenario.path);
    assert.equal(fileInfo.gzip, scenario.gzip);
    assert.equal(fileInfo.extname, scenario.ext);
    assert.equal(fileInfo.mimeType, scenario.mime);
  });
}
