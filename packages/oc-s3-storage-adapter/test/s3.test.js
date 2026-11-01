const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ERROR_DATE, rejection, s3 } = require('./mocks');

const validOptions = {
  bucket: 'test',
  region: 'region-test',
  key: 'test-key',
  secret: 'test-secret',
  path: '/',
  componentsDir: 'components'
};

test('should expose the correct methods', () => {
  const client = s3(validOptions);

  for (const api of [
    { method: 'adapterType', value: 's3' },
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
  const client = s3(validOptions);
  assert.equal(client.isValid(), true);
});

test('validate missing bucket conf', () => {
  const options = {
    region: 'region-test',
    key: 'test-key',
    secret: 'test-secret'
  };
  const client = s3(options);
  assert.equal(client.isValid(), false);
});

test('validate missing region conf', () => {
  const options = {
    bucket: 'test',
    key: 'test-key',
    secret: 'test-secret'
  };
  const client = s3(options);
  assert.equal(client.isValid(), false);
});

test('validate missing key conf', () => {
  const options = {
    bucket: 'test',
    region: 'region-test',
    secret: 'test-secret'
  };
  const client = s3(options);
  assert.equal(client.isValid(), false);
});

test('validate missing secret conf', () => {
  const options = {
    bucket: 'test',
    region: 'region-test',
    key: 'test-key'
  };
  const client = s3(options);
  assert.equal(client.isValid(), false);
});

test('validate missing key/secret conf', () => {
  const missingOptions = {
    bucket: 'test',
    region: 'region-test'
  };
  const client = s3(missingOptions);
  assert.equal(client.isValid(), true);
});

for (const scenario of [
  { src: 'path/test.txt', expected: { err: null, data: 'Hello!' } },
  { src: 'path/test.json', expected: { err: null, data: { data: 'Hello!' } } },
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
    expected: {
      err: {
        code: 'file_not_valid',
        msg: 'File "path/not-a-json.json" not valid'
      }
    }
  }
]) {
  test(`test getFile ${scenario.src}`, async () => {
    const client = s3(validOptions);

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
  const client = s3(validOptions);

  const data1 = await client.getFile('path/to-mutable.txt', false);
  const data2 = await client.getFile('path/to-mutable.txt');
  const data3 = await client.getFile('path/to-mutable.txt', true);

  assert.equal(data1, data2);
  assert.notEqual(data3, data1);
});

test('test getJson force mode', async () => {
  const client = s3(validOptions);

  const data1 = await client.getJson('path/to-mutable.json', false);
  const data2 = await client.getJson('path/to-mutable.json');
  const data3 = await client.getJson('path/to-mutable.json', true);

  assert.equal(data1.value, data2.value);
  assert.notEqual(data3.value, data1.value);
});

for (const scenario of [
  { path: 'components/', expected: ['image/1.0.0', 'image/1.0.1'] },
  { path: 'components/image', expected: ['1.0.0', '1.0.1'] },
  { path: 'components/image/', expected: ['1.0.0', '1.0.1'] }
]) {
  test(`test listObjects when bucket is not empty for folder ${scenario.path}`, async () => {
    const client = s3(validOptions);

    const data = await client.listSubDirectories(scenario.path);

    assert.deepEqual(data, scenario.expected);
  });
}

for (const scenario of ['hello', 'path/']) {
  test(`test listObjects when bucket is empty for folder ${scenario}`, async () => {
    const client = s3({ ...validOptions, bucket: 'my-empty-bucket' });

    assert.deepEqual(await rejection(client.listSubDirectories(scenario)), {
      code: 'dir_not_found',
      msg: `Directory "${scenario}" not found`
    });
  });
}

test('listSubDirectories follows continuation tokens across pages', async () => {
  const client = s3({ ...validOptions, bucket: 'paginated-bucket' });

  const data = await client.listSubDirectories('components/a');

  // Page 1 returns 1.0.0 and 1.0.1, page 2 returns 2.0.0. All three are
  // only returned if the adapter follows NextMarker across pages.
  assert.deepEqual(data, ['1.0.0', '1.0.1', '2.0.0']);
});

test('removeDir follows continuation tokens across pages and deletes all keys', async () => {
  const client = s3({ ...validOptions, bucket: 'paginated-bucket' });

  const result = await client.removeDir('components/a');

  // Page 1 lists two keys, page 2 lists two keys. Four deletes only happen
  // if the adapter paginates using the last Key as the next Marker.
  assert.equal(result.length, 4);
});

test('test getUrl ', () => {
  const client = s3(validOptions);
  assert.equal(
    client.getUrl('test', '1.0.0', 'test.js'),
    '/test/1.0.0/test.js'
  );
});

test('test put dir (failure)', async () => {
  const client = s3(validOptions);

  assert.deepEqual(
    await rejection(
      client.putDir(
        '/absolute-path-to-dir',
        'components\\componentName-error\\1.0.0'
      )
    ),
    {
      code: 1234,
      message: 'an error message',
      retryable: true,
      statusCode: 500,
      time: ERROR_DATE,
      hostname: 'hostname',
      region: 'us-west2'
    }
  );
});

test('test put dir (stream failure throwing)', async () => {
  const client = s3(validOptions);

  await assert.rejects(
    client.putDir(
      '/absolute-path-to-dir',
      'components\\componentName-error-throw\\1.0.0'
    ),
    /sorry/
  );
});

test('Put dir uploads the package.json the last file to use it as a verifier', async () => {
  const client = s3(validOptions);

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
  const client = s3(validOptions);

  const data = await client.putFileContent('words', 'filename.js', true);

  assert.equal(data.ACL, 'authenticated-read');
});

test('test public putFileContent ', async () => {
  const client = s3(validOptions);

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
    const client = s3(validOptions);

    const data = await client.putFile('../path', fileName, false);

    assert.equal(data.ContentType, contentType);
    if (contentEncoding) assert.equal(data.ContentEncoding, contentEncoding);
  });
}
