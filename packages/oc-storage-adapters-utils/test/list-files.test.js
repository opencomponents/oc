const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { listFiles } = require('../dist');

test('should recursively list all files with their full path', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'list-files-'));
  fs.mkdirSync(path.join(dir, 'nested', 'deep'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{}');
  fs.writeFileSync(path.join(dir, '.env'), '');
  fs.writeFileSync(path.join(dir, 'nested', 'template.js'), '');
  fs.writeFileSync(path.join(dir, 'nested', 'deep', 'server.js'), '');

  const files = await listFiles(dir);

  assert.deepEqual(
    files.sort(),
    [
      path.join(dir, '.env'),
      path.join(dir, 'nested', 'deep', 'server.js'),
      path.join(dir, 'nested', 'template.js'),
      path.join(dir, 'package.json')
    ].sort()
  );
  fs.rmSync(dir, { recursive: true, force: true });
});
