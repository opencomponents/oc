const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const expect = require('chai').expect;

const {
  applyBenchmarkAssertions,
  assertCompatibleWorkloads,
  assertPackageReadSequence,
  assertRegressionThresholds,
  assertSuccessRates,
  calculateRegressionPercent
} = require('../../tasks/benchmarks/benchmark-assertions');
const createStorageAdapter = require('../../tasks/benchmarks/storage-adapter');

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeResult = ({
  node = process.version,
  platform = `${process.platform}-${process.arch}`,
  host = os.hostname(),
  key = 'storage-simulated',
  connections = 100,
  duration = '15s',
  method = 'GET',
  body = null,
  storageMinLatencyMs = 8,
  storageMaxLatencyMs = 30,
  storageMaxConcurrentRequests = 128,
  rps = 100,
  p95 = 100,
  packageReads = [10, 20],
  successRates = [1, 1]
} = {}) => ({
  createdAt: '2026-01-01T00:00:00.000Z',
  host,
  node,
  platform,
  benchmarkVersion: 3,
  options: {
    repetitions: packageReads.length,
    connections,
    duration,
    timeout: '5s',
    requests: 0,
    rate: 0,
    disableKeepAlives: false,
    headers: ['Accept: application/json'],
    storageMinLatencyMs,
    storageMaxLatencyMs,
    storageMaxConcurrentRequests
  },
  scenarios: [
    {
      key,
      title: key,
      workload: {
        repetitions: packageReads.length,
        connections,
        duration,
        timeout: '5s',
        requests: 0,
        rate: 0,
        disableKeepAlives: false,
        headers: ['Accept: application/json'],
        request: { method, body },
        storage: {
          minLatencyMs: storageMinLatencyMs,
          maxLatencyMs: storageMaxLatencyMs,
          maxConcurrentRequests: storageMaxConcurrentRequests
        }
      },
      runs: packageReads.map((count, index) => ({
        attempt: index + 1,
        metrics: {
          totalRequests: 100,
          successRequests: successRates[index] * 100,
          rpsMean: rps,
          latencyP95Ms: p95,
          successRate: successRates[index]
        },
        storageWork: {
          successfulRequests: successRates[index] * 100,
          raw: {
            publicReads: count,
            byOperation: {
              getFile: 0,
              getJson: count,
              listSubDirectories: 0
            },
            packageManifestReads: count,
            providerReads: 0,
            templateReads: 0,
            envReads: 0
          },
          perSuccessfulRequest: {
            packageManifestReads:
              successRates[index] > 0
                ? count / (successRates[index] * 100)
                : null
          },
          peakConcurrentReads: count
        }
      })),
      aggregate: {
        samples: packageReads.length,
        rps: { average: rps, min: rps, max: rps },
        latencyP95Ms: { average: p95, min: p95, max: p95 },
        latencyP99Ms: { average: p95, min: p95, max: p95 },
        latencyMeanMs: { average: p95, min: p95, max: p95 },
        successRate: {
          average:
            successRates.reduce((sum, value) => sum + value, 0) /
            successRates.length,
          min: Math.min(...successRates),
          max: Math.max(...successRates)
        }
      }
    }
  ]
});

describe('tasks : benchmark assertions', () => {
  it('accepts compatible workloads and Node minor version differences', () => {
    const current = makeResult({ node: 'v26.5.0' });
    const baseline = makeResult({ node: 'v26.1.0' });
    expect(() => assertCompatibleWorkloads(current, baseline)).not.to.throw();
  });

  it('rejects Node, platform, option, and scenario mismatches', () => {
    const current = makeResult();
    const cases = [
      makeResult({ node: 'v99.0.0' }),
      makeResult({ platform: 'other-architecture' }),
      makeResult({ connections: 50 }),
      makeResult({ duration: '30s' }),
      makeResult({ method: 'POST' }),
      makeResult({ body: '{}' }),
      makeResult({ storageMinLatencyMs: 9 }),
      makeResult({ storageMaxLatencyMs: 31 }),
      makeResult({ storageMaxConcurrentRequests: 64 }),
      makeResult({ key: 'batch-storage' })
    ];
    for (const baseline of cases) {
      expect(() => assertCompatibleWorkloads(current, baseline)).to.throw(
        'Benchmark workload is incompatible'
      );
    }
  });

  it('enforces RPS and p95 regression direction with exact boundaries', () => {
    const baseline = makeResult({ rps: 100, p95: 100 });
    const boundary = makeResult({ rps: 90, p95: 110 });
    expect(() =>
      assertRegressionThresholds(boundary, baseline, {
        maxRpsRegressionPercent: 10,
        maxP95RegressionPercent: 10
      })
    ).not.to.throw();
    expect(() =>
      assertRegressionThresholds(makeResult({ rps: 89 }), baseline, {
        maxRpsRegressionPercent: 10
      })
    ).to.throw('RPS regression');
    expect(() =>
      assertRegressionThresholds(makeResult({ p95: 111 }), baseline, {
        maxP95RegressionPercent: 10
      })
    ).to.throw('p95 regression');
  });

  it('rejects zero baseline values', () => {
    expect(() =>
      calculateRegressionPercent(0, 0, 'higher-is-better')
    ).to.throw('finite positive');
    expect(() =>
      calculateRegressionPercent(1, 0, 'lower-is-better')
    ).to.throw('finite positive');
  });

  it('enforces package reads and success rate for every repetition', () => {
    const result = makeResult();
    expect(() => assertPackageReadSequence(result, [10, 20])).not.to.throw();
    expect(() => assertPackageReadSequence(result, [10, 21])).to.throw(
      'package reads mismatch'
    );
    expect(() => assertSuccessRates(result, 1)).not.to.throw();
    expect(() =>
      assertSuccessRates(makeResult({ successRates: [1, 0.99] }), 1)
    ).to.throw('success rate mismatch');
  });

  it('requires an explicit baseline for timing thresholds', () => {
    expect(() =>
      applyBenchmarkAssertions({
        current: makeResult(),
        maxRpsRegressionPercent: 10
      })
    ).to.throw('explicit baseline file');
  });

  it('counts public adapter operations and preserves active reads on reset', async () => {
    const adapter = createStorageAdapter({
      minLatencyMs: 5,
      maxLatencyMs: 5,
      files: new Map([
        ['components\\example/1.0.0/package.json', '{}'],
        ['components/example/1.0.0/server.js', 'server'],
        ['components/example/1.0.0/template.js', 'template'],
        ['components/example/1.0.0/.env', 'KEY=value']
      ]),
      directories: new Map([['components', ['example']]])
    });
    const pending = adapter.getFile('components/example/1.0.0/server.js');
    expect(adapter.getMetrics().activeReads).to.equal(1);
    adapter.resetMetrics();
    expect(adapter.getMetrics().activeReads).to.equal(1);
    expect(adapter.getMetrics().peakConcurrentReads).to.equal(1);
    await pending;
    await adapter.getJson('/components\\example/1.0.0/package.json');
    await adapter.getFile('components/example/1.0.0/template.js');
    await adapter.getFile('components/example/1.0.0/.env');
    await adapter.listSubDirectories('components');

    const metrics = adapter.getMetrics();
    expect(metrics.activeReads).to.equal(0);
    expect(metrics.completedOperations.byOperation).to.eql({
      getFile: 3,
      getJson: 1,
      listSubDirectories: 1
    });
    expect(
      metrics.completedOperations.byPath[
        'components/example/1.0.0/package.json'
      ].byOperation
    ).to.eql({ getFile: 0, getJson: 1, listSubDirectories: 0 });
    expect(JSON.parse(JSON.stringify(metrics))).to.eql(metrics);

    const fileAdapter = createStorageAdapter({
      fixturesRoot: os.tmpdir(),
      minLatencyMs: 0,
      maxLatencyMs: 0
    });
    let traversalError;
    try {
      await fileAdapter.getFile('../outside.json');
    } catch (error) {
      traversalError = error;
    }
    expect(traversalError?.code).to.equal('invalid_path');
  });
});

describe('tasks : server benchmark verify CLI', () => {
  const serverBenchmarkPath = path.resolve(
    __dirname,
    '../../tasks/benchmarks/server-benchmark.js'
  );
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-benchmark-gates-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const run = (current, baseline, overrides = []) => {
    const currentPath = path.join(tempDir, 'current.json');
    const baselinePath = path.join(tempDir, 'baseline.json');
    fs.writeFileSync(currentPath, JSON.stringify(current));
    fs.writeFileSync(baselinePath, JSON.stringify(baseline));
    return spawnSync(
      process.execPath,
      [
        serverBenchmarkPath,
        `--verify-result-file=${currentPath}`,
        `--baseline-file=${baselinePath}`,
        '--scenarios=storage-simulated',
        '--max-rps-regression-percent=10',
        '--max-p95-regression-percent=10',
        '--expect-package-reads=10,20',
        '--expect-success-rate=1',
        ...overrides
      ],
      { encoding: 'utf8' }
    );
  };

  it('exits zero for a compatible passing result', () => {
    const result = run(
      makeResult({ rps: 90, p95: 110 }),
      makeResult({ rps: 100, p95: 100 })
    );
    expect(result.status, result.stderr).to.equal(0);
  });

  it('exits nonzero for every mismatch class', () => {
    const passingCurrent = makeResult({ rps: 90, p95: 110 });
    const passingBaseline = makeResult({ rps: 100, p95: 100 });
    const cases = [
      [passingCurrent, makeResult({ node: 'v99.0.0' })],
      [passingCurrent, makeResult({ platform: 'other-architecture' })],
      [makeResult({ connections: 50 }), passingBaseline],
      [makeResult({ rps: 89 }), passingBaseline],
      [makeResult({ p95: 111 }), passingBaseline],
      [passingCurrent, makeResult({ rps: 0 })],
      [makeResult({ packageReads: [9, 20] }), passingBaseline],
      [makeResult({ successRates: [1, 0.99] }), passingBaseline],
      [passingCurrent, makeResult({ key: 'batch-storage' })]
    ];
    for (const [current, baseline] of cases) {
      const result = run(clone(current), clone(baseline));
      expect(result.status, `${result.stdout}\n${result.stderr}`).not.to.equal(0);
    }
  });
});
