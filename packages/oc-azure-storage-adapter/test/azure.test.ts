/* eslint-disable @typescript-eslint/no-explicit-any */
import stream from 'node:stream';
import azure from '../src';

//Mock Date functions
const DATE_TO_USE = new Date('2017');
const _Date = Date;
global.Date = jest.fn(() => DATE_TO_USE) as any;
global.Date.UTC = _Date.UTC;
global.Date.parse = _Date.parse;
global.Date.now = _Date.now;

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

  [
    { method: 'adapterType', value: 'azure-blob-storage' },
    { method: 'getFile', type: Function },
    { method: 'getJson', type: Function },
    { method: 'getUrl', type: Function },
    { method: 'isValid', type: Function },
    { method: 'listSubDirectories', type: Function },
    { method: 'maxConcurrentRequests', value: 20 },
    { method: 'putDir', type: Function },
    { method: 'putFileContent', type: Function }
  ].forEach((api) => {
    if (api.type === Function) {
      expect((client as any)[api.method]).toBeInstanceOf(api.type);
    } else {
      expect((client as any)[api.method]).toBe(api.value);
    }
  });
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
  expect(client.isValid()).toBe(true);
});

test('validate valid conf with credentials', () => {
  const client = azure(validOptions);
  expect(client.isValid()).toBe(true);
});

test('validate missing public container', () => {
  // @ts-expect-error Bad config
  const client = azure({
    accountName: 'name',
    privateContainerName: 'privcon'
  });
  expect(client.isValid()).toBe(false);
});

test('validate missing private container', () => {
  // @ts-expect-error Bad config
  const client = azure({
    accountName: 'name',
    publicContainerName: 'pubcon'
  });
  expect(client.isValid()).toBe(false);
});

test('validate missing name', () => {
  // @ts-expect-error Bad config
  const client = azure({
    publicContainerName: 'pubcon',
    privateContainerName: 'privcon'
  });
  expect(client.isValid()).toBe(false);
});

[
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
].forEach((scenario) => {
  test(`test getFile ${scenario.src}`, async () => {
    const client = azure(validOptions);
    const operation = () =>
      client[scenario.src.match(/\.json$/) ? 'getJson' : 'getFile'](
        scenario.src,
        false
      );

    if (scenario.expected.err) {
      return expect(operation()).rejects.toEqual(scenario.expected.err);
    } else {
      return expect(operation()).resolves.toEqual(scenario.expected.data);
    }
  });
});

test('test getFile force mode', async () => {
  const client = azure(validOptions);

  const data1 = await client.getFile('path/to-mutable.txt', false);
  const data2 = await client.getFile('path/to-mutable.txt');
  const data3 = await client.getFile('path/to-mutable.txt', true);

  expect(data1).toBe(data2);
  expect(data3).not.toBe(data1);
});

test('test getJson force mode', async () => {
  const client = azure(validOptions);

  const data1: { value: string } = await client.getJson(
    'path/to-mutable.json',
    false
  );
  const data2: { value: string } = await client.getJson('path/to-mutable.json');
  const data3: { value: string } = await client.getJson(
    'path/to-mutable.json',
    true
  );

  expect(data1.value).toBe(data2.value);
  expect(data3.value).not.toBe(data1.value);
});

[
  { path: 'components/', expected: ['image'] },
  { path: 'components/image', expected: ['1.0.0', '1.0.1'] },
  { path: 'components/image/', expected: ['1.0.0', '1.0.1'] },
  { path: 'components/image/1.0.0/', expected: [] }
].forEach((scenario) => {
  test(`test listObjects when bucket is not empty for folder ${scenario.path}`, async () => {
    const client = azure(validOptions);

    const data = await client.listSubDirectories(scenario.path);

    expect(data).toEqual(scenario.expected);
  });
});

['hello', 'path/'].forEach((scenario) => {
  test(`test listObjects when bucket is empty for folder ${scenario}`, async () => {
    const client = azure(validOptions);

    const data = await client.listSubDirectories(scenario);

    expect(data).toEqual([]);
  });
});

test('test getUrl ', () => {
  const client = azure(validOptions);
  expect(client.getUrl('test', '1.0.0', 'test.js')).toBe('/test/1.0.0/test.js');
});

test('test put dir (failure)', () => {
  const client = azure(validOptions);

  return expect(
    client.putDir(
      '/absolute-path-to-dir',
      'components\\componentName-error\\1.0.0'
    )
  ).rejects.toEqual({ msg: 'sorry' });
});

test('test put dir (stream failure throwing)', () => {
  const client = azure(validOptions);

  return expect(
    client.putDir(
      '/absolute-path-to-dir',
      'components\\componentName-error-throw\\1.0.0'
    )
  ).rejects.toEqual({ msg: 'sorry' });
});

test('Put dir uploads the package.json the last file to use it as a verifier', async () => {
  const client = azure(validOptions);

  const results = (await client.putDir(
    '/absolute-path-to-dir',
    'components\\componentName\\1.0.0'
  )) as any[];

  expect(results.pop().fileName).toBe(
    'components/componentName/1.0.0/package.json'
  );
});

test('test private putFileContent', async () => {
  const client = azure(validOptions);

  const result = (await client.putFileContent(
    'words',
    'filename.js',
    true
  )) as any;

  expect(result.container).toBe('privcon');
});

test('test private putFileContent stream', async () => {
  const client = azure(validOptions);

  const fileContent = 'words';
  const fileStream = new stream.Readable();
  fileStream.push(fileContent);
  fileStream.push(null);

  const result = (await client.putFileContent(
    fileStream,
    'filename.js',
    true
  )) as any;

  expect(result.container).toBe('privcon');
  expect(result.lengthWritten).toBe(fileContent.length);
  expect(result.settings.blobHTTPHeaders.blobCacheControl).toBe(
    'public, max-age=31556926'
  );
});

test('test public putFileContent', async () => {
  const client = azure(validOptions);

  const result = (await client.putFileContent(
    'words',
    'filename.gz',
    false
  )) as any;

  expect(result.container).toBe('pubcon');
});

test('test public putFileContent stream', async () => {
  const client = azure(validOptions);

  const fileContent = 'words';
  const fileStream = new stream.Readable();
  fileStream.push(fileContent);
  fileStream.push(null);

  const result = (await client.putFileContent(
    fileStream,
    'filename.js',
    false
  )) as any;

  expect(result.container).toBe('pubcon');
  expect(result.lengthWritten).toBe(fileContent.length);
});

test('put a js file ', async () => {
  const client = azure(validOptions);

  await expect(client.putFile('../path', 'hello.js', false)).resolves.toEqual({
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
