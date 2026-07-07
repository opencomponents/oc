import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import type { FastifyInstance } from 'fastify';
import type { HttpServerAdapter } from 'oc';
import createFastifyAdapter from '../src';

const asFastify = (adapter: HttpServerAdapter): FastifyInstance =>
  adapter.native() as FastifyInstance;

const closeAdapter = (adapter: HttpServerAdapter): Promise<void> =>
  new Promise((resolve, reject) => {
    adapter.close((err) => (err ? reject(err) : resolve()));
  });

const listen = (adapter: HttpServerAdapter): Promise<void> =>
  new Promise((resolve, reject) => {
    adapter.listen({ port: 0, timeout: 120000 }, (err) =>
      err ? reject(err) : resolve()
    );
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

  expect(first.statusCode).toBe(200);
  expect(first.json()).toEqual({ ok: true });
  expect(etag).toMatch(/^"/);
  expect(etag).not.toMatch(/^W\//);

  const second = await app.inject({
    headers: { 'if-none-match': String(etag) },
    url: '/component'
  });

  expect(second.statusCode).toBe(304);
  expect(second.body).toBe('');

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

  expect(response.statusCode).toBe(200);
  expect(response.headers['access-control-allow-origin']).toBe('*');
  expect(response.headers.allow).toBe('GET, HEAD, POST, OPTIONS');

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

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
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

  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toBe('text/plain');
  expect(response.headers['x-route-id']).toBe('asset');
  expect(response.headers['x-cookie-session']).toBe('abc123');
  expect(response.headers['x-user']).toBe('publisher');
  expect(response.body).toBe('path/to/file.js');

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

  expect(response.statusCode).toBe(200);
  expect(setCookie).toContain('session=abc');
  expect(setCookie).toContain('Max-Age=60');
  expect(setCookie).toContain('Path=/');
  expect(setCookie).toContain('SameSite=Lax');
  expect(setCookie).not.toContain('Max-Age=60000');

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

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ ok: true });

  await closeAdapter(adapter);
});

test('defaults listen host to all interfaces and reports invalid ports via callback', async () => {
  const adapter = createFastifyAdapter();

  await listen(adapter);

  const address = adapter.httpServer().address();
  expect(address && typeof address !== 'string' ? address.address : '').toBe(
    '0.0.0.0'
  );

  await closeAdapter(adapter);

  const invalidAdapter = createFastifyAdapter();
  await new Promise<void>((resolve, reject) => {
    try {
      invalidAdapter.listen({ port: 'not-a-port', timeout: 120000 }, (err) => {
        try {
          expect(err).toBeInstanceOf(Error);
          expect(err?.message).toContain('numeric port');
          resolve();
        } catch (assertionErr) {
          reject(assertionErr);
        }
      });
    } catch (err) {
      reject(err);
    }
  });

  await closeAdapter(invalidAdapter);
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

  expect(empty.statusCode).toBe(404);
  expect(empty.headers['content-type']).toBeUndefined();
  expect(getOnlyOptions.headers.allow).toBe('GET, HEAD, OPTIONS');
  expect(postOnlyOptions.headers.allow).toBe('POST, OPTIONS');

  await closeAdapter(adapter);
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

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
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
