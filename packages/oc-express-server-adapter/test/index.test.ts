import type http from 'node:http';
import type { Express } from 'express';
import type { HttpServerAdapter } from '../src';
import createExpressAdapter from '../src';

const asExpress = (adapter: HttpServerAdapter): Express =>
  adapter.native() as Express;

const closeAdapter = (adapter: HttpServerAdapter): Promise<void> =>
  new Promise((resolve, reject) => {
    adapter.close((err) => (err ? reject(err) : resolve()));
  });

const listen = (
  adapter: HttpServerAdapter,
  port: number | string = 0
): Promise<void> =>
  new Promise((resolve, reject) => {
    adapter.listen({ port, timeout: 120000 }, (err) =>
      err ? reject(err) : resolve()
    );
  });

const request = async (
  adapter: HttpServerAdapter,
  method: string,
  url: string,
  opts: {
    headers?: Record<string, string>;
    body?: string | Buffer;
  } = {}
): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}> => {
  const { default: nodeHttp } = await import('node:http');
  const address = adapter.httpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected TCP server address');
  }

  return new Promise((resolve, reject) => {
    const req = nodeHttp.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        method,
        path: url,
        headers: opts.headers
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      }
    );
    req.on('error', reject);
    if (opts.body) {
      req.write(opts.body);
    }
    req.end();
  });
};

test('exposes express as the native app and sets strong etags', () => {
  const adapter = createExpressAdapter({ port: 3030 });
  const app = asExpress(adapter);

  expect(adapter.name).toBe('express');
  expect(app.get('port')).toBe(3030);
  expect(app.get('etag')).toBe('strong');
  expect(app.get('json spaces')).toBe(0);
});

test('returns strong etags and honours conditional requests', async () => {
  const adapter = createExpressAdapter();
  adapter.route('get', '/component', 'component', [
    (_req, res) => {
      res.status(200).json({ ok: true });
    }
  ]);

  await listen(adapter);

  const first = await request(adapter, 'GET', '/component');
  const etag = first.headers.etag;

  expect(first.statusCode).toBe(200);
  expect(JSON.parse(first.body)).toEqual({ ok: true });
  expect(etag).toMatch(/^"/);
  expect(String(etag)).not.toMatch(/^W\//);

  const second = await request(adapter, 'GET', '/component', {
    headers: { 'if-none-match': String(etag) }
  });

  expect(second.statusCode).toBe(304);
  expect(second.body).toBe('');

  await closeAdapter(adapter);
});

test('parses json and urlencoded bodies', async () => {
  const adapter = createExpressAdapter();
  adapter.enableBodyParser({ limit: '1mb' });
  adapter.route('post', '/json', 'json', [
    (req, res) => {
      res.json(req.body);
    }
  ]);
  adapter.route('post', '/form', 'form', [
    (req, res) => {
      res.json(req.body);
    }
  ]);

  await listen(adapter);

  const json = await request(adapter, 'POST', '/json', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hello: 'world' })
  });
  expect(json.statusCode).toBe(200);
  expect(JSON.parse(json.body)).toEqual({ hello: 'world' });

  const form = await request(adapter, 'POST', '/form', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'a[b]=1&a[c]=2'
  });
  expect(form.statusCode).toBe(200);
  expect(JSON.parse(form.body)).toEqual({ a: { b: '1', c: '2' } });

  await closeAdapter(adapter);
});

test('normalises splat params to a single path string', async () => {
  const adapter = createExpressAdapter();
  let seen: Record<string, string> | undefined;

  adapter.route('get', '/files/*splat', 'files', [
    (req, res) => {
      seen = req.params;
      res.send('ok');
    }
  ]);

  await listen(adapter);

  const response = await request(adapter, 'GET', '/files/a/b/c');
  expect(response.statusCode).toBe(200);
  expect(seen?.['splat']).toBe('a/b/c');

  await closeAdapter(adapter);
});

test('fromConnect preserves native connect middleware', async () => {
  const adapter = createExpressAdapter();
  const handler = adapter.fromConnect((req, res, next) => {
    res.setHeader('x-from-connect', '1');
    if (req.url === '/stop') {
      res.end('stopped');
      return;
    }
    next();
  });

  adapter.route('get', '/continue', 'continue', [
    handler,
    (_req, res) => {
      res.send('continued');
    }
  ]);
  adapter.route('get', '/stop', 'stop', [handler]);

  await listen(adapter);

  const continued = await request(adapter, 'GET', '/continue');
  expect(continued.statusCode).toBe(200);
  expect(continued.headers['x-from-connect']).toBe('1');
  expect(continued.body).toBe('continued');

  const stopped = await request(adapter, 'GET', '/stop');
  expect(stopped.statusCode).toBe(200);
  expect(stopped.headers['x-from-connect']).toBe('1');
  expect(stopped.body).toBe('stopped');

  await closeAdapter(adapter);
});

test('accepts a bare port option', () => {
  const adapter = createExpressAdapter(4321);
  expect(asExpress(adapter).get('port')).toBe(4321);
});
