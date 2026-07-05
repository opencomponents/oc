/* eslint-disable @typescript-eslint/no-explicit-any */
import s3 from '../src';

//Mock Date functions
const DATE_TO_USE = new Date('2017');
const _Date = Date;
global.Date = jest.fn(() => DATE_TO_USE) as any;
global.Date.UTC = _Date.UTC;
global.Date.parse = _Date.parse;
global.Date.now = _Date.now;

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

  [
    { method: 'adapterType', value: 's3' },
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

test('validate valid conf', () => {
  const client = s3(validOptions);
  expect(client.isValid()).toBe(true);
});

test('validate missing bucket conf', () => {
  const options = {
    region: 'region-test',
    key: 'test-key',
    secret: 'test-secret'
  };
  // @ts-expect-error Bad config
  const client = s3(options);
  expect(client.isValid()).toBe(false);
});

test('validate missing region conf', () => {
  const options = {
    bucket: 'test',
    key: 'test-key',
    secret: 'test-secret'
  };
  // @ts-expect-error Bad config
  const client = s3(options);
  expect(client.isValid()).toBe(false);
});

test('validate missing key conf', () => {
  const options = {
    bucket: 'test',
    region: 'region-test',
    secret: 'test-secret'
  };
  // @ts-expect-error Bad config
  const client = s3(options);
  expect(client.isValid()).toBe(false);
});

test('validate missing secret conf', () => {
  const options = {
    bucket: 'test',
    region: 'region-test',
    key: 'test-key'
  };
  // @ts-expect-error Bad config
  const client = s3(options);
  expect(client.isValid()).toBe(false);
});

test('validate missing key/secret conf', () => {
  const missingOptions = {
    bucket: 'test',
    region: 'region-test'
  };
  // @ts-expect-error Bad config
  const client = s3(missingOptions);
  expect(client.isValid()).toBe(true);
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
    const client = s3(validOptions);

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
  const client = s3(validOptions);

  const data1 = await client.getFile('path/to-mutable.txt', false);
  const data2 = await client.getFile('path/to-mutable.txt');
  const data3 = await client.getFile('path/to-mutable.txt', true);

  expect(data1).toBe(data2);
  expect(data3).not.toBe(data1);
});

test('test getJson force mode', async () => {
  const client = s3(validOptions);

  const data1 = (await client.getJson('path/to-mutable.json', false)) as {
    value: string;
  };
  const data2 = (await client.getJson('path/to-mutable.json')) as {
    value: string;
  };
  const data3 = (await client.getJson('path/to-mutable.json', true)) as {
    value: string;
  };

  expect(data1.value).toBe(data2.value);
  expect(data3.value).not.toBe(data1.value);
});

[
  { path: 'components/', expected: ['image/1.0.0', 'image/1.0.1'] },
  { path: 'components/image', expected: ['1.0.0', '1.0.1'] },
  { path: 'components/image/', expected: ['1.0.0', '1.0.1'] }
].forEach((scenario) => {
  test(`test listObjects when bucket is not empty for folder ${scenario.path}`, async () => {
    const client = s3(validOptions);

    const data = await client.listSubDirectories(scenario.path);

    expect(data).toEqual(scenario.expected);
  });
});

['hello', 'path/'].forEach((scenario) => {
  test(`test listObjects when bucket is empty for folder ${scenario}`, () => {
    const client = s3({ ...validOptions, bucket: 'my-empty-bucket' });

    return expect(client.listSubDirectories(scenario)).rejects.toEqual({
      code: 'dir_not_found',
      msg: `Directory "${scenario}" not found`
    });
  });
});

test('listSubDirectories follows continuation tokens across pages', async () => {
  const client = s3({ ...validOptions, bucket: 'paginated-bucket' });

  const data = await client.listSubDirectories('components/a');

  // Page 1 returns 1.0.0 and 1.0.1, page 2 returns 2.0.0. All three are
  // only returned if the adapter follows NextMarker across pages.
  expect(data).toEqual(['1.0.0', '1.0.1', '2.0.0']);
});

test('removeDir follows continuation tokens across pages and deletes all keys', async () => {
  const client = s3({ ...validOptions, bucket: 'paginated-bucket' });

  const result = (await client.removeDir('components/a')) as unknown[];

  // Page 1 lists two keys, page 2 lists two keys. Four deletes only happen
  // if the adapter paginates using the last Key as the next Marker.
  expect(result).toHaveLength(4);
});

test('test getUrl ', () => {
  const client = s3(validOptions);
  expect(client.getUrl('test', '1.0.0', 'test.js')).toBe('/test/1.0.0/test.js');
});

test('test put dir (failure)', () => {
  const client = s3(validOptions);

  return expect(
    client.putDir(
      '/absolute-path-to-dir',
      'components\\componentName-error\\1.0.0'
    )
  ).rejects.toEqual({
    code: 1234,
    message: 'an error message',
    retryable: true,
    statusCode: 500,
    time: DATE_TO_USE,
    hostname: 'hostname',
    region: 'us-west2'
  });
});

test('test put dir (stream failure throwing)', () => {
  const client = s3(validOptions);

  return expect(
    client.putDir(
      '/absolute-path-to-dir',
      'components\\componentName-error-throw\\1.0.0'
    )
  ).rejects.toThrow('sorry');
});

test('Put dir uploads the package.json the last file to use it as a verifier', async () => {
  const client = s3(validOptions);

  const results = (await client.putDir(
    '/absolute-path-to-dir',
    'components\\componentName\\1.0.0'
  )) as any[];

  expect(results.pop().Key).toBe('components/componentName/1.0.0/package.json');
});

test('test private putFileContent ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFileContent('words', 'filename.js', true)) as {
    ACL: string;
  };

  expect(data.ACL).toBe('authenticated-read');
});

test('test public putFileContent ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFileContent('words', 'filename.gz', false)) as {
    ACL: string;
  };

  expect(data.ACL).toBe('public-read');
});

test('put a js file ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFile('../path', 'hello.js', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('application/javascript');
});

test('put a gzipped js file ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFile('../path', 'hello.js.gz', false)) as {
    ContentType: string;
    ContentEncoding: string;
  };

  expect(data.ContentType).toBe('application/javascript');
  expect(data.ContentEncoding).toBe('gzip');
});

test('put a css file ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFile('../path', 'hello.css', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('text/css');
});

test('put a gzipped css file ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFile('../path', 'hello.css.gz', false)) as {
    ContentType: string;
    ContentEncoding: string;
  };

  expect(data.ContentType).toBe('text/css');
  expect(data.ContentEncoding).toBe('gzip');
});

test('put a jpg file ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFile('../path', 'hello.jpg', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('image/jpeg');
});

test('put a gif file ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFile('../path', 'hello.gif', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('image/gif');
});

test('put a png file ', async () => {
  const client = s3(validOptions);

  const data = (await client.putFile('../path', 'hello.png', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('image/png');
});
