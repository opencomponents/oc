const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { test } = require('node:test');
const { gzipSync } = require('node:zlib');
const createFastifyAdapter = require('../dist');

const asFastify = (adapter) => adapter.native();

const closeAdapter = (adapter) => adapter.close();

const listen = (adapter, port = 0) => adapter.listen({ port, timeout: 120000 });

test('preserves callback-based listen and close with a deprecation warning', (t, done) => {
  const emitWarning = t.mock.method(process, 'emitWarning', () => true);
  const adapter = createFastifyAdapter();

  adapter.listen({ port: 0, timeout: 120000 }, (listenError) => {
    assert.equal(listenError, undefined);

    adapter.close((closeError) => {
      assert.equal(closeError, undefined);
      assert.equal(emitWarning.mock.callCount(), 1);
      const [message, type] = emitWarning.mock.calls[0].arguments;
      assert.ok(message.includes('HTTP server adapter callback API'));
      assert.equal(type, 'DeprecationWarning');
      emitWarning.mock.restore();
      done();
    });
  });
});

test('returns strong etags and honours conditional requests', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.route('get', '/component', 'component', [
    (_req, res) => {
      res.status(200).json({ ok: true });
    }
  ]);

  await app.ready();

  const first = await app.inject('/component');
  const etag = first.headers.etag;

  assert.equal(first.statusCode, 200);
  assert.deepEqual(first.json(), { ok: true });
  assert.match(etag, /^"/);
  assert.doesNotMatch(etag, /^W\//);

  const second = await app.inject({
    headers: { 'if-none-match': String(etag) },
    url: '/component'
  });

  assert.equal(second.statusCode, 304);
  assert.equal(second.body, '');

  await closeAdapter(adapter);
});

test('runs neutral middleware for OPTIONS and exposes an Express-like allow header', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.use((_req, res) => {
    res.removeHeader('X-Powered-By');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, PUT, POST');
  });
  adapter.route('get', '/component', 'component-get', [
    (_req, res) => {
      res.send('ok');
    }
  ]);
  adapter.route('post', '/component', 'component-post', [
    (_req, res) => {
      res.status(201).send('created');
    }
  ]);

  await listen(adapter);

  const response = await app.inject({ method: 'OPTIONS', url: '/component' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['access-control-allow-origin'], '*');
  assert.equal(response.headers.allow, 'GET, HEAD, POST, OPTIONS');

  await closeAdapter(adapter);
});

test('uses qs semantics for urlencoded request bodies', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.enableBodyParser({ limit: '1mb' });
  adapter.route('post', '/submit', 'submit', [
    (req, res) => {
      res.json(req.body);
    }
  ]);

  await app.ready();

  const response = await app.inject({
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    payload: 'user[name]=Ada&items[]=one&items[]=two',
    url: '/submit'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    items: ['one', 'two'],
    user: { name: 'Ada' }
  });

  await closeAdapter(adapter);
});

test('normalises cookies, wildcard params, connect middleware, and streams', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.enableCookies();
  adapter.route('get', '/assets/*splat', 'asset', [
    adapter.fromConnect((req, _res, next) => {
      req.user = 'publisher';
      next();
    }),
    (req, res) => {
      res.set('x-route-id', req.routeId);
      res.set('x-cookie-session', req.cookies['session']);
      res.set('x-user', req.user || '');
      res.type('text/plain');
      res.stream(Readable.from([req.params['splat']]));
    }
  ]);

  await app.ready();

  const response = await app.inject({
    headers: { cookie: 'session=abc123' },
    url: '/assets/path/to/file.js'
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-type'], 'text/plain');
  assert.equal(response.headers['x-route-id'], 'asset');
  assert.equal(response.headers['x-cookie-session'], 'abc123');
  assert.equal(response.headers['x-user'], 'publisher');
  assert.equal(response.body, 'path/to/file.js');

  await closeAdapter(adapter);
});

test('translates Express cookie options to Fastify cookie options', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.enableCookies();
  adapter.route('get', '/cookies', 'cookies', [
    (_req, res) => {
      res.cookie('session', 'abc', { maxAge: 60000, sameSite: 'lax' });
      res.send('ok');
    }
  ]);

  await app.ready();

  const response = await app.inject('/cookies');
  const setCookie = String(response.headers['set-cookie']);

  assert.equal(response.statusCode, 200);
  assert.ok(setCookie.includes('session=abc'));
  assert.ok(setCookie.includes('Max-Age=60'));
  assert.ok(setCookie.includes('Path=/'));
  assert.ok(setCookie.includes('SameSite=Lax'));
  assert.ok(!setCookie.includes('Max-Age=60000'));

  await closeAdapter(adapter);
});

test('inflates compressed JSON request bodies', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.enableBodyParser({ limit: '1mb' });
  adapter.route('post', '/json', 'json', [
    (req, res) => {
      res.json(req.body);
    }
  ]);

  await app.ready();

  const response = await app.inject({
    headers: {
      'content-encoding': 'gzip',
      'content-type': 'application/json'
    },
    method: 'POST',
    payload: gzipSync(JSON.stringify({ ok: true })),
    url: '/json'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true });

  await closeAdapter(adapter);
});

test('defaults listen host to all interfaces', async () => {
  const adapter = createFastifyAdapter();

  await listen(adapter);

  const address = adapter.httpServer().address();
  assert.equal(
    address && typeof address !== 'string' ? address.address : '',
    '0.0.0.0'
  );

  await closeAdapter(adapter);
});

test('listens on Azure named pipes', async (t) => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);
  const pipe = String.raw`\\.\pipe\cdfd043b-d3a4-4c5d-bb08-c17a644a30ab`;
  const listenSpy = t.mock.method(app, 'listen', () => Promise.resolve());

  await listen(adapter, pipe);

  assert.deepEqual(listenSpy.mock.calls[0].arguments, [{ path: pipe }]);
});

test('ignores trailing slashes like Express strict routing off', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.route(
    'get',
    '/registry/:componentName/:componentVersion/~preview',
    'preview',
    [
      (req, res) => {
        res.json({ params: req.params });
      }
    ]
  );

  await app.ready();

  const withoutSlash = await app.inject(
    '/registry/a11y-widget/4.0.66/~preview?userId=1'
  );
  const withSlash = await app.inject(
    '/registry/a11y-widget/4.0.66/~preview/?userId=1'
  );

  assert.equal(withoutSlash.statusCode, 200);
  assert.deepEqual(withoutSlash.json(), {
    params: { componentName: 'a11y-widget', componentVersion: '4.0.66' }
  });
  assert.equal(withSlash.statusCode, 200);
  assert.deepEqual(withSlash.json(), {
    params: { componentName: 'a11y-widget', componentVersion: '4.0.66' }
  });

  await closeAdapter(adapter);
});

test('deduplicates trailing-slash variants to avoid Fastify duplicate route errors', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.route('get', '/components', 'prefix-index', [
    (_req, res) => {
      res.send('index');
    }
  ]);
  adapter.route('get', '/components/', 'index', [
    (_req, res) => {
      res.send('index');
    }
  ]);

  await app.ready();

  const withoutSlash = await app.inject('/components');
  const withSlash = await app.inject('/components/');

  assert.equal(withoutSlash.statusCode, 200);
  assert.equal(withSlash.statusCode, 200);
  assert.equal(withoutSlash.body, 'index');
  assert.equal(withSlash.body, 'index');

  await closeAdapter(adapter);
});

test('returns 404 for empty handler arrays and scopes allow headers to matching routes', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);

  adapter.route('get', '/empty', 'empty', []);
  adapter.route('get', '/get-only', 'get-only', [
    (_req, res) => {
      res.send('ok');
    }
  ]);
  adapter.route('post', '/post-only', 'post-only', [
    (_req, res) => {
      res.send('ok');
    }
  ]);

  await listen(adapter);

  const empty = await app.inject('/empty');
  const getOnlyOptions = await app.inject({
    method: 'OPTIONS',
    url: '/get-only'
  });
  const postOnlyOptions = await app.inject({
    method: 'OPTIONS',
    url: '/post-only'
  });

  assert.equal(empty.statusCode, 404);
  assert.equal(empty.headers['content-type'], undefined);
  assert.equal(getOnlyOptions.headers.allow, 'GET, HEAD, OPTIONS');
  assert.equal(postOnlyOptions.headers.allow, 'POST, OPTIONS');

  await closeAdapter(adapter);
});

test('skips multipart parsing for non-publish methods', async (t) => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);
  const tempDir = await mkdtemp(path.join(tmpdir(), 'oc-fastify-adapter-'));
  const filename = t.mock.fn((originalName) => originalName);

  adapter.enableFileUploads({ filename, tempDir });
  adapter.route('post', '/components', 'components', [
    (_req, res) => res.json({})
  ]);
  await app.ready();

  const response = await app.inject({
    headers: { 'content-type': 'multipart/form-data; boundary=unused' },
    method: 'POST',
    payload: '--unused--\r\n',
    url: '/components'
  });

  assert.equal(response.statusCode, 200);
  assert.equal(filename.mock.callCount(), 0);

  await closeAdapter(adapter);
  await rm(tempDir, { force: true, recursive: true });
});

test('normalises multipart uploads into OC files and body fields', async () => {
  const adapter = createFastifyAdapter();
  const app = asFastify(adapter);
  const tempDir = await mkdtemp(path.join(tmpdir(), 'oc-fastify-adapter-'));

  adapter.enableFileUploads({
    filename: (originalName) => `stored-${originalName}`,
    tempDir
  });
  adapter.route('put', '/publish/:componentName/:componentVersion', 'publish', [
    async (req, res) => {
      const files = Array.isArray(req.files) ? req.files : [];
      const firstFile = files[0];

      res.json({
        body: req.body,
        file: firstFile
          ? {
              destination: firstFile.destination,
              fieldname: firstFile.fieldname,
              filename: firstFile.filename,
              mimetype: firstFile.mimetype,
              originalname: firstFile.originalname,
              saved: await readFile(firstFile.path, 'utf8'),
              size: firstFile.size
            }
          : undefined,
        params: req.params
      });
    }
  ]);

  await app.ready();

  const boundary = 'oc-fastify-boundary';
  const payload = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="description"',
    '',
    'demo',
    `--${boundary}`,
    'Content-Disposition: form-data; name="package"; filename="component.tar.gz"',
    'Content-Type: application/gzip',
    '',
    'component archive',
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const response = await app.inject({
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    method: 'PUT',
    payload,
    url: '/publish/hello-world/1.0.0'
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    body: { description: 'demo' },
    file: {
      destination: tempDir,
      fieldname: 'package',
      filename: 'stored-component.tar.gz',
      mimetype: 'application/gzip',
      originalname: 'component.tar.gz',
      saved: 'component archive',
      size: 'component archive'.length
    },
    params: {
      componentName: 'hello-world',
      componentVersion: '1.0.0'
    }
  });

  await closeAdapter(adapter);
  await rm(tempDir, { force: true, recursive: true });
});
