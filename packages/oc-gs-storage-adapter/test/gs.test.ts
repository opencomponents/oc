/* eslint-disable @typescript-eslint/no-explicit-any */
import gs from '../src';

jest.mock('node-dir', () => {
  return {
    paths: jest.fn((pathToDir, cb) => {
      const sep = require('node:path').sep;
      cb(null, {
        files: [
          `${pathToDir}${sep}package.json`,
          `${pathToDir}${sep}server.js`,
          `${pathToDir}${sep}.env`,
          `${pathToDir}${sep}template.js`
        ]
      });
    })
  };
});

//Mock Date functions
const DATE_TO_USE = new Date('2017');
const _Date = Date;
global.Date = jest.fn(() => DATE_TO_USE) as any;
global.Date.UTC = _Date.UTC;
global.Date.parse = _Date.parse;
global.Date.now = _Date.now;

const validOptions = {
  bucket: 'test',
  projectId: '12345',
  path: '/',
  componentsDir: 'components'
};

test('should expose the correct methods', () => {
  const client = gs(validOptions);
  [
    { method: 'adapterType', value: 'gs' },
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
  const client = gs(validOptions);
  expect(client.isValid()).toBe(true);
});

test('validate missing bucket conf', () => {
  const options = {
    projectId: '12345',
    path: 'somepath'
  };
  // @ts-expect-error Bad config
  const client = gs(options);
  expect(client.isValid()).toBe(false);
});

test('validate missing project conf', () => {
  const options = {
    bucket: 'test',
    path: 'somepath'
  };
  // @ts-expect-error Bad config
  const client = gs(options);
  expect(client.isValid()).toBe(false);
});

test('validate missing path conf', () => {
  const options = {
    bucket: 'test',
    projectId: '12345'
  };
  // @ts-expect-error Bad config
  const client = gs(options);
  expect(client.isValid()).toBe(false);
});

// Functions utilizing Google Storage
[
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
].forEach((scenario) => {
  test(`test getFile ${scenario.src}`, async () => {
    const client = gs(validOptions);
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
  const client = gs(validOptions);

  const data1 = await client.getFile('path/to-mutable.txt', false);
  const data2 = await client.getFile('path/to-mutable.txt');
  const data3 = await client.getFile('path/to-mutable.txt', true);

  expect(data1).toBe(data2);
  expect(data3).not.toBe(data1);
});

test('test getJson force mode', async () => {
  const client = gs(validOptions);

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
  // TODO: investigate why this scenario fails
  // { path: 'components/', expected: ['image/1.0.0', 'image/1.0.1'] },
  { path: 'components/image', expected: ['1.0.0', '1.0.1'] },
  { path: 'components/image/', expected: ['1.0.0', '1.0.1'] }
].forEach((scenario) => {
  test(`test listSubDirectories when bucket is not empty for folder ${scenario.path}`, async () => {
    const client = gs(validOptions);

    const data = await client.listSubDirectories(scenario.path);

    expect(data).toEqual(scenario.expected);
  });
});

['hello', 'path/'].forEach((scenario) => {
  test(`test listSubDirectories when bucket is empty for folder ${scenario}`, () => {
    const client = gs({ ...validOptions, bucket: 'my-empty-bucket' });

    return expect(client.listSubDirectories(scenario)).rejects.toEqual({
      code: 'dir_not_found',
      msg: `Directory "${scenario}" not found`
    });
  });
});

test('listSubDirectories follows pageToken across pages', async () => {
  const client = gs({ ...validOptions, bucket: 'paginated-bucket' });

  const data = await client.listSubDirectories('components/a');

  // Page 1 yields 1.0.0, page 2 yields 2.0.0. Both are only returned if the
  // adapter follows the nextQuery pageToken across pages.
  expect(data).toEqual(['1.0.0', '2.0.0']);
});

test('removeDir follows pageToken across pages and deletes all files', async () => {
  const client = gs({ ...validOptions, bucket: 'paginated-bucket' });

  const result = (await client.removeDir('components/a')) as unknown[];

  // Page 1 lists two files, page 2 lists one file. Three deletes only happen
  // if the adapter paginates using the nextQuery pageToken.
  expect(result).toHaveLength(3);
});

test('test getUrl ', () => {
  const client = gs(validOptions);
  expect(client.getUrl('test', '1.0.0', 'test.js')).toBe('/test/1.0.0/test.js');
});

test('test put dir (failure)', () => {
  const client = gs(validOptions);

  return expect(
    client.putDir(
      '/absolute-path-to-dir',
      'components\\componentName-error\\1.0.0'
    )
  ).rejects.toEqual({ code: 1234, msg: 'an error message' });
});

test('Put dir uploads the package.json the last file to use it as a verifier', async () => {
  const client = gs(validOptions);

  const results = (await client.putDir(
    '/absolute-path-to-dir',
    'components\\componentName\\1.0.0'
  )) as any[];

  expect(results.pop().Key).toBe('components/componentName/1.0.0/package.json');
});

test('test private putFileContent ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFileContent('words', 'filename.js', true)) as {
    ACL: string;
  };

  expect(data.ACL).toBe('authenticated-read');
});

test('test public putFileContent ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFileContent('words', 'filename.gz', false)) as {
    ACL: string;
  };

  expect(data.ACL).toBe('public-read');
});

test('put a js file ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFile('../path', 'hello.js', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('application/javascript');
});

test('put a gzipped js file ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFile('../path', 'hello.js.gz', false)) as {
    ContentType: string;
    ContentEncoding: string;
  };

  expect(data.ContentType).toBe('application/javascript');
  expect(data.ContentEncoding).toBe('gzip');
});

test('put a css file ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFile('../path', 'hello.css', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('text/css');
});

test('put a gzipped css file ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFile('../path', 'hello.css.gz', false)) as {
    ContentType: string;
    ContentEncoding: string;
  };

  expect(data.ContentType).toBe('text/css');
  expect(data.ContentEncoding).toBe('gzip');
});

test('put a jpg file ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFile('../path', 'hello.jpg', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('image/jpeg');
});

test('put a gif file ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFile('../path', 'hello.gif', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('image/gif');
});

test('put a png file ', async () => {
  const client = gs(validOptions);

  const data = (await client.putFile('../path', 'hello.png', false)) as {
    ContentType: string;
  };

  expect(data.ContentType).toBe('image/png');
});
