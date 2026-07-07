import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import path from 'node:path';
import createFastifyAdapter from '../src';

type RegistryFactory = typeof import('../../oc/dist/registry').default;
type StartedRegistry = ReturnType<RegistryFactory>;

type StartedData = {
  app: unknown;
  server: { address(): string | { port: number } | null };
};

const Registry = require(path.resolve(__dirname, '../../../oc/dist/registry'))
  .default as RegistryFactory;
const fixturePath = path.resolve(
  __dirname,
  '../../../oc/test/fixtures/components'
);

const getPort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close((err) => {
        if (err) {
          reject(err);
        } else if (address && typeof address !== 'string') {
          resolve(address.port);
        } else {
          reject(new Error('Could not allocate test port'));
        }
      });
    });
  });

const closeRegistry = (registry: StartedRegistry): Promise<void> =>
  new Promise((resolve, reject) => {
    registry.close((err) => (err instanceof Error ? reject(err) : resolve()));
  });

const startRegistry = async (
  options: Record<string, unknown> = {}
): Promise<{
  baseUrl: string;
  data: StartedData;
  registry: StartedRegistry;
}> => {
  const port = await getPort();
  const registry = Registry({
    baseUrl: `http://localhost:${port}/`,
    dependencies: ['lodash.isequal'],
    env: { name: 'local' },
    local: true,
    path: fixturePath,
    port,
    server: {
      adapter: createFastifyAdapter,
      options: { port }
    },
    verbosity: 0,
    ...options
  } as never);

  const data = await new Promise<StartedData>((resolve, reject) => {
    registry.start((err, startData) => {
      if (err) {
        reject(err);
      } else {
        resolve(startData as StartedData);
      }
    });
  });

  return { baseUrl: `http://localhost:${port}`, data, registry };
};

async function testRegistryComponentResponses(): Promise<void> {
  const { baseUrl, data, registry } = await startRegistry();

  try {
    const address = data.server.address();
    const response = await fetch(`${baseUrl}/hello-world/1.0.0`);
    const body = (await response.json()) as Record<string, unknown>;

    assert.equal(typeof data.app, 'object');
    assert.ok(data.app && typeof data.app === 'object' && 'server' in data.app);
    assert.ok(address && typeof address !== 'string');
    assert.equal(response.status, 200);
    assert.equal(body['name'], 'hello-world');
    assert.equal(body['version'], '1.0.0');
  } finally {
    await closeRegistry(registry);
  }
}

async function testRegistryEtags(): Promise<void> {
  const { baseUrl, registry } = await startRegistry();

  try {
    const url = `${baseUrl}/oc-client/client.js`;
    const first = await fetch(url);
    const etag = first.headers.get('etag');
    const second = await fetch(url, {
      headers: { 'if-none-match': etag || '' }
    });

    assert.equal(first.status, 200);
    assert.match(etag || '', /^"/);
    assert.doesNotMatch(etag || '', /^W\//);
    assert.equal(second.status, 304);
    assert.equal(await second.text(), '');
  } finally {
    await closeRegistry(registry);
  }
}

async function testRegistryOptions(): Promise<void> {
  const { baseUrl, registry } = await startRegistry();

  try {
    const response = await fetch(`${baseUrl}/hello-world`, {
      headers: {
        'access-control-request-method': 'GET',
        origin: 'http://example.com'
      },
      method: 'OPTIONS'
    });
    const allow = response.headers.get('allow') || '';

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(
      response.headers.get('access-control-allow-methods'),
      'GET, OPTIONS, PUT, POST'
    );
    assert.ok(allow.includes('GET'));
    assert.ok(allow.includes('OPTIONS'));
  } finally {
    await closeRegistry(registry);
  }
}

async function testRegistryUserRouteUrlencodedBody(): Promise<void> {
  const { baseUrl, registry } = await startRegistry({
    prefix: '/components/',
    routes: [
      {
        handler: (
          req: { body: unknown },
          res: { json(body: unknown): void }
        ) => {
          res.json(req.body);
        },
        method: 'POST',
        route: '/echo'
      }
    ]
  });

  try {
    const response = await fetch(`${baseUrl}/echo`, {
      body: 'user[name]=Ada&items[]=one&items[]=two',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST'
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      items: ['one', 'two'],
      user: { name: 'Ada' }
    });
  } finally {
    await closeRegistry(registry);
  }
}

async function main(): Promise<void> {
  await testRegistryComponentResponses();
  await testRegistryEtags();
  await testRegistryOptions();
  await testRegistryUserRouteUrlencodedBody();
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
