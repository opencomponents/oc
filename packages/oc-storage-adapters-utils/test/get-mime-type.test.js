const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getMimeType } = require('../dist');

const scenarios = [
  { ext: '.js', mime: 'application/javascript' },
  { ext: '.css', mime: 'text/css' },
  { ext: '.gif', mime: 'image/gif' },
  { ext: '.jpg', mime: 'image/jpeg' },
  { ext: '.map', mime: 'application/json' },
  { ext: '.png', mime: 'image/png' },
  { ext: '.svg', mime: 'image/svg+xml' },
  { ext: '.html', mime: 'text/html' },
  { ext: '.heisenberg', mime: undefined }
];

for (const scenario of scenarios) {
  test(`test ${scenario.ext} extension`, () => {
    assert.equal(getMimeType(scenario.ext), scenario.mime);
  });
}
