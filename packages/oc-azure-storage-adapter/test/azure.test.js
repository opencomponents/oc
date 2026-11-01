const assert = require('node:assert/strict');
const stream = require('node:stream');
const { test } = require('node:test');
const { azure, rejection } = require('./mocks');

const validOptions = {
  publicContainerName: 'pubcon',
  privateContainerName: 'privcon',
  accountName: 'name',
  accountKey: 'key',
  path: '/',
  componentsDir: 'components'
};

test('should expose the correct methods', () => {
  const client = azure(validOptions);

  for (const api of [
    { method: 'adapterType', value: 'azure-blob-storage' },
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

test('validate valid conf without credentials', () => {
  const options = {
    accountName: 'name',
    publicContainerName: 'pubcon',
    privateContainerName: 'privcon',
    path: 'path',
    componentsDir: 'components'
  };
  const client = azure(options);
  assert.equal(client.isValid(), true);
});

test('validate valid conf with credentials', () => {
  const client = azure(validOptions);
  assert.equal(client.isValid(), true);
});

test('validate missing public container', () => {
  const client = azure({
    accountName: 'name',
    privateContainerName: 'privcon'
  });
  assert.equal(client.isValid(), false);
});

test('validate missing private container', () => {
  const client = azure({
    accountName: 'name',
    publicContainerName: 'pubcon'
  });
  assert.equal(client.isValid(), false);
});

test('validate missing name', () => {
  const client = azure({
    publicContainerName: 'pubcon',
    privateContainerName: 'privcon'
  });
  assert.equal(client.isValid(), false);
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
    const client = azure(validOptions);
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
  const client = azure(validOptions);

  const data1 = await client.getFile('path/to-mutable.txt', false);
  const data2 = await client.getFile('path/to-mutable.txt');
  const data3 = await client.getFile('path/to-mutable.txt', true);

  assert.equal(data1, data2);
  assert.notEqual(data3, data1);
});

test('test getJson force mode', async () => {
  const client = azure(validOptions);

  const data1 = await client.getJson('path/to-mutable.json', false);
  const data2 = await client.getJson('path/to-mutable.json');
  const data3 = await client.getJson('path/to-mutable.json', true);

  assert.equal(data1.value, data2.value);
  assert.notEqual(data3.value, data1.value);
});

for (const scenario of [
  { path: 'components/', expected: ['image'] },
  { path: 'components/image', expected: ['1.0.0', '1.0.1'] },
  { path: 'components/image/', expected: ['1.0.0', '1.0.1'] },
  { path: 'components/image/1.0.0/', expected: [] }
]) {
  test(`test listObjects when bucket is not empty for folder ${scenario.path}`, async () => {
    const client = azure(validOptions);

    const data = await client.listSubDirectories(scenario.path);

    assert.deepEqual(data, scenario.expected);
  });
}

for (const scenario of ['hello', 'path/']) {
  test(`test listObjects when bucket is empty for folder ${scenario}`, async () => {
    const client = azure(validOptions);

    const data = await client.listSubDirectories(scenario);

    assert.deepEqual(data, []);
  });
}

test('test getUrl ', () => {
  const client = azure(validOptions);
  assert.equal(
    client.getUrl('test', '1.0.0', 'test.js'),
    '/test/1.0.0/test.js'
  );
});

test('test put dir (failure)', async () => {
  const client = azure(validOptions);

  assert.deepEqual(
    await rejection(
      client.putDir(
        '/absolute-path-to-dir',
        'components\\componentName-error\\1.0.0'
      )
    ),
    { msg: 'sorry' }
  );
});

test('test put dir (stream failure throwing)', async () => {
  const client = azure(validOptions);

  assert.deepEqual(
    await rejection(
      client.putDir(
        '/absolute-path-to-dir',
        'components\\componentName-error-throw\\1.0.0'
      )
    ),
    { msg: 'sorry' }
  );
});

test('Put dir uploads the package.json the last file to use it as a verifier', async () => {
  const client = azure(validOptions);

  const results = await client.putDir(
    '/absolute-path-to-dir',
    'components\\componentName\\1.0.0'
  );

  assert.equal(
    results.pop().fileName,
    'components/componentName/1.0.0/package.json'
  );
});

test('test private putFileContent', async () => {
  const client = azure(validOptions);

  const result = await client.putFileContent('words', 'filename.js', true);

  assert.equal(result.container, 'privcon');
});

test('test private putFileContent stream', async () => {
  const client = azure(validOptions);

  const fileContent = 'words';
  const fileStream = new stream.Readable();
  fileStream.push(fileContent);
  fileStream.push(null);

  const result = await client.putFileContent(fileStream, 'filename.js', true);

  assert.equal(result.container, 'privcon');
  assert.equal(result.lengthWritten, fileContent.length);
  assert.equal(
    result.settings.blobHTTPHeaders.blobCacheControl,
    'public, max-age=31556926'
  );
});

test('test public putFileContent', async () => {
  const client = azure(validOptions);

  const result = await client.putFileContent('words', 'filename.gz', false);

  assert.equal(result.container, 'pubcon');
});

test('test public putFileContent stream', async () => {
  const client = azure(validOptions);

  const fileContent = 'words';
  const fileStream = new stream.Readable();
  fileStream.push(fileContent);
  fileStream.push(null);

  const result = await client.putFileContent(fileStream, 'filename.js', false);

  assert.equal(result.container, 'pubcon');
  assert.equal(result.lengthWritten, fileContent.length);
});

test('put a js file ', async () => {
  const client = azure(validOptions);

  assert.deepEqual(await client.putFile('../path', 'hello.js', false), {
    container: 'pubcon',
    fileName: 'hello.js',
    lengthWritten: 16,
    settings: {
      blobHTTPHeaders: {
        blobCacheControl: 'public, max-age=31556926',
        blobContentType: 'application/javascript'
      }
    }
  });
});
