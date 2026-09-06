const expect = require('chai').expect;
const http = require('node:http');
const zlib = require('node:zlib');

const createExpressAdapter =
  require('../../dist/registry/domain/http-server/express-adapter').default;
const sanitise =
  require('../../dist/registry/domain/options-sanitiser').default;
const middleware = require('../../dist/registry/middleware');

// Large enough to clear the compression threshold (1KB default) and to
// resemble batch/discovery JSON payloads.
const payload = {
  components: Array.from({ length: 100 }, (_, i) => ({
    name: `component-${i}`,
    version: '1.0.0',
    description:
      'A repeatable description string that compresses well. '.repeat(5)
  }))
};
const expectedBody = JSON.stringify(payload);

const request = (port, { acceptEncoding, method = 'GET', path = '/json' } = {}) =>
  new Promise((resolve, reject) => {
    const headers = {};
    if (acceptEncoding) {
      headers['Accept-Encoding'] = acceptEncoding;
    }
    const req = http.request(
      {
        headers,
        hostname: '127.0.0.1',
        method,
        path,
        port
      },
      (res) => {
        const chunks = [];

        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            body: Buffer.concat(chunks),
            headers: res.headers,
            statusCode: res.statusCode
          })
        );
      }
    );

    req.on('error', reject);
    req.end();
  });

const startServer = (compression) =>
  new Promise((resolve, reject) => {
    const adapter = createExpressAdapter();
    const options = sanitise({
      baseUrl: 'http://registry.example.com/',
      compileClient: false,
      compression,
      local: true
    });

    middleware.bind(adapter, options);
    adapter.route('get', '/json', 'json', [(_req, res) => res.json(payload)]);

    adapter.listen({ keepAliveTimeout: 1000, port: 0, timeout: 1000 }, (err) => {
      if (err) {
        reject(err);
        return;
      }

      const address = adapter.httpServer().address();
      resolve({ adapter, port: address.port });
    });
  });

const closeServer = (adapter) =>
  new Promise((resolve, reject) => {
    adapter.close((err) => (err ? reject(err) : resolve()));
  });

describe('registry : middleware : compression', () => {
  describe('options-sanitiser', () => {
    it('should default compression to false', () => {
      expect(
        sanitise({ baseUrl: 'http://registry.example.com/' }).compression
      ).to.equal(false);
    });

    it('should preserve an explicit opt-in', () => {
      expect(
        sanitise({
          baseUrl: 'http://registry.example.com/',
          compression: true
        }).compression
      ).to.equal(true);
    });
  });

  describe('when compression is not enabled (default)', () => {
    it('should serve JSON uncompressed even with Accept-Encoding: gzip', async () => {
      const { adapter, port } = await startServer();

      try {
        const response = await request(port, { acceptEncoding: 'gzip' });

        expect(response.statusCode).to.equal(200);
        expect(response.headers['content-encoding']).to.be.undefined;
        expect(response.body.toString()).to.equal(expectedBody);
      } finally {
        await closeServer(adapter);
      }
    });
  });

  describe('when compression is enabled', () => {
    it('should gzip JSON responses for Accept-Encoding: gzip', async () => {
      const { adapter, port } = await startServer(true);

      try {
        const response = await request(port, { acceptEncoding: 'gzip' });

        expect(response.statusCode).to.equal(200);
        expect(response.headers['content-encoding']).to.equal('gzip');
        expect(response.body.length).to.be.below(
          Buffer.byteLength(expectedBody)
        );
        expect(zlib.gunzipSync(response.body).toString()).to.equal(
          expectedBody
        );
      } finally {
        await closeServer(adapter);
      }
    });

    it('should deflate JSON responses for Accept-Encoding: deflate', async () => {
      const { adapter, port } = await startServer(true);

      try {
        const response = await request(port, { acceptEncoding: 'deflate' });

        expect(response.statusCode).to.equal(200);
        expect(response.headers['content-encoding']).to.equal('deflate');
        expect(zlib.inflateSync(response.body).toString()).to.equal(
          expectedBody
        );
      } finally {
        await closeServer(adapter);
      }
    });

    it('should serve identity when the client sends no Accept-Encoding', async () => {
      const { adapter, port } = await startServer(true);

      try {
        const response = await request(port);

        expect(response.statusCode).to.equal(200);
        expect(response.headers['content-encoding']).to.be.undefined;
        expect(response.body.toString()).to.equal(expectedBody);
      } finally {
        await closeServer(adapter);
      }
    });
  });
});
