const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { expect } = require('chai');

describe('tasks : benchmark package boundaries', () => {
  const benchmarkDir = path.resolve(
    __dirname,
    '../../../registry/tasks/benchmarks'
  );
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-benchmark-smoke-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs the cold-burst benchmark from the registry workspace', () => {
    const result = spawnSync(
      process.execPath,
      [path.join(benchmarkDir, 'single-flight-burst.js')],
      {
        cwd: path.resolve(benchmarkDir, '../..'),
        encoding: 'utf8',
        timeout: 15000
      }
    );
    expect(result.error).to.equal(undefined);
    expect(result.status, result.stderr).to.equal(0);
    expect(JSON.parse(result.stdout).results.map((result) => result.n))
      .to.eql([50, 200]);
  });

  it('packages fixtures and starts local and storage registries outside the old workspace', () => {
    fs.cpSync(
      path.resolve(__dirname, '../fixtures/components/hello-world'),
      path.join(tempDir, 'hello-world'),
      { recursive: true, filter: (source) => path.basename(source) !== '_package' }
    );
    const result = spawnSync(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const fs = require('node:fs');
      const path = require('node:path');
      const { ensurePackaged, startRegistry } = require(${JSON.stringify(path.join(benchmarkDir, 'server-benchmark.js'))});
      (async () => {
        const packaged = await ensurePackaged(path.resolve('hello-world'));
        assert.ok(fs.existsSync(path.join(packaged, 'package.json')));
        for (const scenario of ['local-memory', 'storage-simulated']) {
          const server = await startRegistry(scenario, {
            storageMinLatencyMs: 0,
            storageMaxLatencyMs: 0,
            storageMaxConcurrentRequests: 2
          });
          try {
            const componentName = scenario === 'local-memory'
              ? 'hello-world' : 'hello-world-benchmark-1';
            const response = await fetch(server.baseUrl + componentName + '/1.0.0', {
              headers: { Accept: 'application/json' }
            });
            assert.equal(response.status, 200);
            assert.equal((await response.json()).name, componentName);
          } finally {
            await server.close();
          }
        }
      })().catch(error => { console.error(error); process.exit(1); });
    `], { cwd: tempDir, encoding: 'utf8', timeout: 15000 });
    expect(result.error).to.equal(undefined);
    expect(result.status, result.stderr || result.stdout).to.equal(0);
  });
});
