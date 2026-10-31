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

test('should include symlinked files and files in symlinked directories', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'list-files-symlinks-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source');
  const upload = path.join(dir, 'upload');
  fs.mkdirSync(source);
  fs.mkdirSync(upload);
  fs.writeFileSync(path.join(source, 'asset.js'), 'asset');
  fs.symlinkSync(
    path.join(source, 'asset.js'),
    path.join(upload, 'linked.js'),
    'file'
  );
  fs.symlinkSync(source, path.join(upload, 'assets'), 'junction');

  assert.deepEqual((await listFiles(upload)).sort(), [
    path.join(upload, 'assets', 'asset.js'),
    path.join(upload, 'linked.js')
  ]);
});
