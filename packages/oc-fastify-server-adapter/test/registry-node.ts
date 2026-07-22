import assert from 'node:assert/strict';
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import type http from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import type { RegistryOptions } from '../../oc/dist/registry';
import type { HttpServerAdapterFactory } from '../../oc/dist/registry/domain/http-server/types';
import createFastifyAdapter from '..';

type RegistryFactory = typeof import('../../oc/dist/registry').default;
type StartedRegistry = ReturnType<RegistryFactory>;

type StartedData = {
  app: FastifyInstance;
  server: http.Server;
};

const Registry = require(path.resolve(__dirname, '../../../oc/dist/registry'))
  .default as RegistryFactory;
const fixturePath = path.resolve(
  __dirname,
  '../../../oc/test/fixtures/components'
);
const targz = require('targz') as {
  compress(
    opts: { src: string; dest: string },
    cb: (err?: Error | string) => void
  ): void;
};
const compress = promisify(targz.compress);

type FileStorageOptions = {
  componentsDir: string;
  path: string;
  root: string;
};

const inferRegistryOptions = <T, U extends HttpServerAdapterFactory>(
  options: RegistryOptions<T, U>
) => options;
const fastifyRegistryOptions = inferRegistryOptions({
  baseUrl: 'http://localhost:3000/',
  server: {
    adapter: createFastifyAdapter,
    options: { host: '127.0.0.1', trustProxy: true }
  }
});
void fastifyRegistryOptions;

const storagePath = (root: string, filePath: string): string =>
  path.join(root, filePath);

const fileNotFound = (filePath: string): Error & { code: string } => {
  const err = new Error(`File "${filePath}" not found`) as Error & {
    code: string;
  };
  err.code = 'file_not_found';
  return err;
};

const readStorageFile = async (
  root: string,
  filePath: string
): Promise<Buffer> => {
  try {
    return await readFile(storagePath(root, filePath));
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw fileNotFound(filePath);
    }
    throw err;
  }
};

const createFileStorageAdapter = (options: FileStorageOptions) => ({
  adapterType: 'file',
  maxConcurrentRequests: 10,
  getFile: (filePath: string) => readStorageFile(options.root, filePath),
  getJson: async (filePath: string) =>
    JSON.parse(
      (await readStorageFile(options.root, filePath)).toString('utf8')
    ),
  getUrl: (filePath: string) => `${options.path}/${filePath}`,
  listSubDirectories: async (directory: string) => {
    const fullPath = storagePath(options.root, directory);
    try {
      const entries = await readdir(fullPath);
      const directories = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(fullPath, entry);
          return (await stat(entryPath)).isDirectory() ? entry : undefined;
        })
      );
      return directories.filter((entry): entry is string => !!entry);
    } catch {
      return [];
    }
  },
  putDir: (source: string, destination: string) =>
    cp(source, storagePath(options.root, destination), { recursive: true }),
  putFile: (source: string, destination: string) =>
    cp(source, storagePath(options.root, destination)),
  putFileContent: async (content: string, destination: string) => {
    const fullPath = storagePath(options.root, destination);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
  }
});

const readJson = async <T>(response: Response, label: string): Promise<T> => {
  const text = await response.text();
  assert.notEqual(text, '', `${label}: expected JSON response body`);
  return JSON.parse(text) as T;
};

const removeTempDir = (directory: string): Promise<void> =>
  rm(directory, {
    force: true,
    maxRetries: 5,
    recursive: true,
    retryDelay: 100
  });

const createPublishArchive = async (): Promise<{
  archivePath: string;
  tempDir: string;
}> => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'oc-fastify-publish-'));
  const sourceDir = path.join(tempDir, 'source');
  const packageDir = path.join(sourceDir, '_package');
  const archivePath = path.join(tempDir, 'published-fastify-1.0.0.tar.gz');

  await mkdir(packageDir, { recursive: true });
  await writeFile(
    path.join(packageDir, 'package.json'),
    JSON.stringify({
      name: 'published-fastify',
      version: '1.0.0',
      oc: { files: { template: {} } }
    })
  );
  await writeFile(
    path.join(packageDir, 'template.js'),
    'module.exports = "ok";'
  );
  await compress({ src: sourceDir, dest: archivePath });

  return { archivePath, tempDir };
};

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
  });

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
    const response = await fetch(`${baseUrl}/handlebars3-component/1.0.0`, {
      headers: { accept: 'application/vnd.oc.unrendered+json' }
    });
    const body = await readJson<Record<string, unknown>>(
      response,
      'component response'
    );

    assert.equal(typeof data.app, 'object');
    assert.ok(data.app && typeof data.app === 'object' && 'server' in data.app);
    assert.ok(address && typeof address !== 'string');
    assert.equal(response.status, 200);
    assert.equal(body['name'], 'handlebars3-component');
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

async function testRegistryStaticStream(): Promise<void> {
  const { baseUrl, registry } = await startRegistry();

  try {
    const response = await fetch(
      `${baseUrl}/handlebars3-component/1.0.0/static/template.js`
    );
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(
      response.headers.get('content-type') || '',
      /^application\/javascript/
    );
    assert.match(body, /Hello world!/);
  } finally {
    await closeRegistry(registry);
  }
}

async function testRegistryBatchPost(): Promise<void> {
  const { baseUrl, registry } = await startRegistry();

  try {
    const response = await fetch(`${baseUrl}/`, {
      body: JSON.stringify({ components: [] }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await readJson(response, 'batch response'), []);
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
    assert.deepEqual(await readJson(response, 'urlencoded response'), {
      items: ['one', 'two'],
      user: { name: 'Ada' }
    });
  } finally {
    await closeRegistry(registry);
  }
}

async function testRegistryNonLocalPublishWithAuth(): Promise<void> {
  const port = await getPort();
  const storageRoot = await mkdtemp(path.join(tmpdir(), 'oc-fastify-storage-'));
  const { archivePath, tempDir } = await createPublishArchive();
  const registry = Registry({
    baseUrl: `http://localhost:${port}/`,
    dependencies: [],
    env: { name: 'test' },
    local: false,
    path: fixturePath,
    port,
    publishAuth: { type: 'basic', username: 'alice', password: 'secret' },
    server: {
      adapter: createFastifyAdapter,
      options: { host: '127.0.0.1', port }
    },
    storage: {
      adapter: createFileStorageAdapter,
      options: {
        componentsDir: 'components',
        path: `http://localhost:${port}/storage`,
        root: storageRoot
      }
    },
    verbosity: 0
  } as never);

  const createForm = async () => {
    const form = new FormData();
    form.set(
      'package',
      new Blob([new Uint8Array(await readFile(archivePath))], {
        type: 'application/gzip'
      }),
      'published-fastify-1.0.0.tar.gz'
    );
    return form;
  };

  try {
    await new Promise<void>((resolve, reject) => {
      registry.start((err) => (err ? reject(err) : resolve()));
    });

    const unauthorized = await fetch(
      `http://localhost:${port}/published-fastify/1.0.0`,
      {
        body: await createForm(),
        method: 'PUT'
      }
    );
    assert.equal(unauthorized.status, 401);

    const authorized = await fetch(
      `http://localhost:${port}/published-fastify/1.0.0`,
      {
        body: await createForm(),
        headers: {
          authorization: `Basic ${Buffer.from('alice:secret').toString('base64')}`,
          'user-agent': `oc-cli-0.50.56/v${process.versions.node}-test`
        },
        method: 'PUT'
      }
    );
    const body = await readJson<Record<string, unknown>>(
      authorized,
      'publish response'
    );
    const publishedPackage = JSON.parse(
      await readFile(
        path.join(
          storageRoot,
          'components/published-fastify/1.0.0/package.json'
        ),
        'utf8'
      )
    ) as { oc?: { publisher?: string } };

    assert.equal(authorized.status, 200);
    assert.deepEqual(body, { ok: true });
    assert.equal(publishedPackage.oc?.publisher, 'alice');
  } finally {
    await closeRegistry(registry).catch(() => undefined);
    await removeTempDir(storageRoot);
    await removeTempDir(tempDir);
  }
}

async function main(): Promise<void> {
  await testRegistryComponentResponses();
  await testRegistryEtags();
  await testRegistryOptions();
  await testRegistryStaticStream();
  await testRegistryBatchPost();
  await testRegistryUserRouteUrlencodedBody();
  await testRegistryNonLocalPublishWithAuth();
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
