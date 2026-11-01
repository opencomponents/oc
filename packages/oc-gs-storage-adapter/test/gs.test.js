const assert = require('node:assert/strict');
const { sep } = require('node:path');
const { test } = require('node:test');
const { loadGs, rejection } = require('./mocks');

const gs = loadGs(async (pathToDir) => [
  `${pathToDir}${sep}package.json`,
  `${pathToDir}${sep}server.js`,
  `${pathToDir}${sep}.env`,
  `${pathToDir}${sep}template.js`
]);

const validOptions = {
  bucket: 'test',
  projectId: '12345',
  path: '/',
  componentsDir: 'components'
};

test('should expose the correct methods', () => {
  const client = gs(validOptions);
  for (const api of [
    { method: 'adapterType', value: 'gs' },
    { method: 'getFile', type: Function },
    { method: 'getJson', type: Function },
    { method: 'getUrl', type: Function },
    { method: 'isValid', type: Function },
    { method: 'listSubDirectories', type: Function },
    { method: 'maxConcurrentRequests', value: 20 },
    { method: 'putDir', type: Function },
    { method: 'putFileContent', type: Function }
  ]) {
    if (api.type === Function) {
      assert.ok(client[api.method] instanceof api.type);
    } else {
      assert.equal(client[api.method], api.value);
    }
  }
});

test('validate valid conf', () => {
  const client = gs(validOptions);
  assert.equal(client.isValid(), true);
});

test('validate missing bucket conf', () => {
  const options = {
    projectId: '12345',
    path: 'somepath'
  };
  const client = gs(options);
  assert.equal(client.isValid(), false);
});

test('validate missing project conf', () => {
  const options = {
    bucket: 'test',
    path: 'somepath'
  };
  const client = gs(options);
  assert.equal(client.isValid(), false);
});

test('validate missing path conf', () => {
  const options = {
    bucket: 'test',
    projectId: '12345'
  };
  const client = gs(options);
  assert.equal(client.isValid(), false);
});

// Functions utilizing Google Storage
for (const scenario of [
  { src: 'path/test.txt', expected: { err: null, data: 'Hello!' } },
  { src: 'path/test.json', expected: { err: null, data: { value: 'Hello!' } } },
  {
    src: 'path/not-found.txt',
    expected: {
      err: {
        code: 'file_not_found',
        msg: 'File "path/not-found.txt" not found'
      }
    }
  },
  {
    src: 'path/not-found.json',
    expected: {
      err: {
        code: 'file_not_found',
        msg: 'File "path/not-found.json" not found'
      }
    }
  },
  {
    src: 'path/not-a-json.json',
    expected: { err: { code: '1', msg: 'not an error' } }
  }
]) {
  test(`test getFile ${scenario.src}`, async () => {
    const client = gs(validOptions);
    const operation = () =>
      client[scenario.src.match(/\.json$/) ? 'getJson' : 'getFile'](
        scenario.src,
        false
      );

    if (scenario.expected.err) {
      assert.deepEqual(await rejection(operation()), scenario.expected.err);
    } else {
      assert.deepEqual(await operation(), scenario.expected.data);
    }
  });
}

test('test getFile force mode', async () => {
  const client = gs(validOptions);

  const data1 = await client.getFile('path/to-mutable.txt', false);
  const data2 = await client.getFile('path/to-mutable.txt');
  const data3 = await client.getFile('path/to-mutable.txt', true);

  assert.equal(data1, data2);
  assert.notEqual(data3, data1);
});

test('test getJson force mode', async () => {
  const client = gs(validOptions);

  const data1 = await client.getJson('path/to-mutable.json', false);
  const data2 = await client.getJson('path/to-mutable.json');
  const data3 = await client.getJson('path/to-mutable.json', true);

  assert.equal(data1.value, data2.value);
  assert.notEqual(data3.value, data1.value);
});

for (const scenario of [
  // TODO: investigate why this scenario fails
  // { path: 'components/', expected: ['image/1.0.0', 'image/1.0.1'] },
  { path: 'components/image', expected: ['1.0.0', '1.0.1'] },
  { path: 'components/image/', expected: ['1.0.0', '1.0.1'] }
]) {
  test(`test listSubDirectories when bucket is not empty for folder ${scenario.path}`, async () => {
    const client = gs(validOptions);

    const data = await client.listSubDirectories(scenario.path);

    assert.deepEqual(data, scenario.expected);
  });
}

for (const scenario of ['hello', 'path/']) {
  test(`test listSubDirectories when bucket is empty for folder ${scenario}`, async () => {
    const client = gs({ ...validOptions, bucket: 'my-empty-bucket' });

    assert.deepEqual(await rejection(client.listSubDirectories(scenario)), {
      code: 'dir_not_found',
      msg: `Directory "${scenario}" not found`
    });
  });
}

test('listSubDirectories follows pageToken across pages', async () => {
  const client = gs({ ...validOptions, bucket: 'paginated-bucket' });

  const data = await client.listSubDirectories('components/a');

  // Page 1 yields 1.0.0, page 2 yields 2.0.0. Both are only returned if the
  // adapter follows the nextQuery pageToken across pages.
  assert.deepEqual(data, ['1.0.0', '2.0.0']);
});

test('listSubDirectories preserves provider errors', async () => {
  const client = gs({ ...validOptions, bucket: 'failing-bucket' });

  assert.deepEqual(await rejection(client.listSubDirectories('components/a')), {
    code: 503,
    message: 'Service unavailable'
  });
});

test('listSubDirectories preserves missing bucket errors', async () => {
  const client = gs({ ...validOptions, bucket: 'missing-bucket' });

  assert.deepEqual(await rejection(client.listSubDirectories('components/a')), {
    code: 404,
    message: 'Bucket not found'
  });
});

test('listSubDirectories preserves unchanged pageToken errors', async () => {
  const client = gs({
    ...validOptions,
    bucket: 'unchanged-page-token-bucket'
  });

  await assert.rejects(
    client.listSubDirectories('components/a'),
    /GCS getFiles returned an unchanged pageToken; aborting to avoid an infinite loop/
  );
});

test('removeDir follows pageToken across pages and deletes all files', async () => {
  const client = gs({ ...validOptions, bucket: 'paginated-bucket' });

  const result = await client.removeDir('components/a');

  // Page 1 lists two files, page 2 lists one file. Three deletes only happen
  // if the adapter paginates using the nextQuery pageToken.
  assert.equal(result.length, 3);
});

test('test getUrl ', () => {
  const client = gs(validOptions);
  assert.equal(
    client.getUrl('test', '1.0.0', 'test.js'),
    '/test/1.0.0/test.js'
  );
});

test('test put dir (failure)', async () => {
  const client = gs(validOptions);

  assert.deepEqual(
    await rejection(
      client.putDir(
        '/absolute-path-to-dir',
        'components\\componentName-error\\1.0.0'
      )
    ),
    { code: 1234, msg: 'an error message' }
  );
});

test('Put dir uploads the package.json the last file to use it as a verifier', async () => {
  const client = gs(validOptions);

  const results = await client.putDir(
    '/absolute-path-to-dir',
    'components\\componentName\\1.0.0'
  );

  assert.equal(
    results.pop().Key,
    'components/componentName/1.0.0/package.json'
  );
});

test('test private putFileContent ', async () => {
  const client = gs(validOptions);

  const data = await client.putFileContent('words', 'filename.js', true);

  assert.equal(data.ACL, 'authenticated-read');
});

test('test public putFileContent ', async () => {
  const client = gs(validOptions);

  const data = await client.putFileContent('words', 'filename.gz', false);

  assert.equal(data.ACL, 'public-read');
});

for (const [fileName, contentType, contentEncoding] of [
  ['hello.js', 'application/javascript'],
  ['hello.js.gz', 'application/javascript', 'gzip'],
  ['hello.css', 'text/css'],
  ['hello.css.gz', 'text/css', 'gzip'],
  ['hello.jpg', 'image/jpeg'],
  ['hello.gif', 'image/gif'],
  ['hello.png', 'image/png']
]) {
  test(`put a ${fileName} file`, async () => {
    const client = gs(validOptions);

    const data = await client.putFile('../path', fileName, false);

    assert.equal(data.ContentType, contentType);
    if (contentEncoding) assert.equal(data.ContentEncoding, contentEncoding);
  });
}
