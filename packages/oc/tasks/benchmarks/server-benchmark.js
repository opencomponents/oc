const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { promisify } = require('node:util');
const getPort = require('getport');

const {
  applyBenchmarkAssertions
} = require('./benchmark-assertions');
const createStorageAdapter = require('./storage-adapter');
const oc = require('../../dist');

const getPortAsync = promisify(getPort);

const DEFAULT_OUT_DIR = path.resolve('test/results/benchmarks');
const DEFAULT_REPETITIONS = 5;
const DEFAULT_HEADERS = ['Accept: application/json'];
const BATCH_SOURCE_COMPONENTS = [
  'hello-world',
  'no-containers',
  'empty',
  'language',
  'lodash-component'
];
const BATCH_COMPONENT_NAMES = BATCH_SOURCE_COMPONENTS.flatMap((name) =>
  Array.from({ length: 4 }, (_, index) => `${name}-benchmark-${index + 1}`)
);

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseNumber = (value, fallback) => {
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseList = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseOptionalNonnegativeNumber = (value, label) => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a nonnegative number`);
  }
  return parsed;
};

const parseExpectedPackageReads = (value) => {
  if (value === undefined) return undefined;
  const entries = String(value).split(',');
  if (
    entries.length === 0 ||
    entries.some((entry) => !/^\d+$/.test(entry.trim()))
  ) {
    throw new Error('expect-package-reads must contain comma-separated integers');
  }
  return entries.map((entry) => Number(entry.trim()));
};

const nowIsoCompact = () => new Date().toISOString().replace(/[:.]/g, '-');

const getResourceUsage = () => {
  const usage = process.resourceUsage();
  const memoryUsage = process.memoryUsage();
  
  return {
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    },
    cpu: {
      userTime: usage.userCPUTime / 1000000, // seconds
      systemTime: usage.systemCPUTime / 1000000 // seconds
    }
  };
};

const startResourceMonitoring = () => {
  const baseline = getResourceUsage();
  const startTime = process.hrtime.bigint();
  
  return {
    baseline,
    startTime,
    getDelta: () => {
      const current = getResourceUsage();
      const endTime = process.hrtime.bigint();
      const elapsedMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      return {
        memory: {
          heapUsedDelta: current.memory.heapUsed - baseline.memory.heapUsed,
          heapTotalDelta: current.memory.heapTotal - baseline.memory.heapTotal,
          rssDelta: current.memory.rss - baseline.memory.rss
        },
        cpu: {
          userTimeDelta: current.cpu.userTime - baseline.cpu.userTime,
          systemTimeDelta: current.cpu.systemTime - baseline.cpu.systemTime,
          elapsedSeconds: elapsedMs / 1000
        },
        current
      };
    }
  };
};

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const writeJson = async (filePath, data) => {
  await ensureDir(path.dirname(filePath));
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
};

const copyDirectory = async (source, destination) => {
  await fs.promises.mkdir(destination, { recursive: true });
  await fs.promises.cp(source, destination, {
    recursive: true,
    force: true
  });
};

const readJson = async (filePath) =>
  JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

const ensurePackaged = async (componentPath) => {
  const packagePath = path.join(componentPath, '_package', 'package.json');
  try {
    await fs.promises.access(packagePath);
  } catch {
    await new Promise((resolve, reject) => {
      oc.cli.package({ componentPath, compress: false }, (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
  return path.join(componentPath, '_package');
};

const calculatePercentageChange = (current, baseline) => {
  if (baseline === 0) return current > 0 ? 100 : 0;
  return ((current - baseline) / baseline) * 100;
};

const formatPercentageChange = (change) => {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

const compareWithBaseline = (current, baseline) => {
  if (!baseline) return null;
  
  const comparison = {};
  
  for (const scenario of current.scenarios) {
    const baselineScenario = baseline.scenarios.find(s => s.key === scenario.key);
    if (!baselineScenario) continue;
    
    const currentAggregate = scenario.aggregate;
    const baselineAggregate = baselineScenario.aggregate;
    
    comparison[scenario.key] = {
      rps: {
        current: currentAggregate.rps.average,
        baseline: baselineAggregate.rps.average,
        change: calculatePercentageChange(currentAggregate.rps.average, baselineAggregate.rps.average),
        improved: currentAggregate.rps.average > baselineAggregate.rps.average
      },
      latencyP95Ms: {
        current: currentAggregate.latencyP95Ms.average,
        baseline: baselineAggregate.latencyP95Ms.average,
        change: calculatePercentageChange(currentAggregate.latencyP95Ms.average, baselineAggregate.latencyP95Ms.average),
        improved: currentAggregate.latencyP95Ms.average < baselineAggregate.latencyP95Ms.average
      },
      latencyP99Ms: {
        current:
          currentAggregate.latencyP99Ms?.average ??
          currentAggregate.latencyMeanMs.average,
        baseline:
          baselineAggregate.latencyP99Ms?.average ??
          baselineAggregate.latencyMeanMs.average,
        change: calculatePercentageChange(
          currentAggregate.latencyP99Ms?.average ??
            currentAggregate.latencyMeanMs.average,
          baselineAggregate.latencyP99Ms?.average ??
            baselineAggregate.latencyMeanMs.average
        ),
        improved:
          (currentAggregate.latencyP99Ms?.average ??
            currentAggregate.latencyMeanMs.average) <
          (baselineAggregate.latencyP99Ms?.average ??
            baselineAggregate.latencyMeanMs.average)
      },
      successRate: {
        current: currentAggregate.successRate.average,
        baseline: baselineAggregate.successRate.average,
        change: calculatePercentageChange(currentAggregate.successRate.average, baselineAggregate.successRate.average),
        improved: currentAggregate.successRate.average >= baselineAggregate.successRate.average
      }
    };
    
    // Add resource comparison if available (only for benchmarkVersion >= 2)
    if (scenario.resourceUsage && baselineScenario.resourceUsage && baseline.benchmarkVersion >= 2) {
      comparison[scenario.key].memory = {
        heapUsedDelta: {
          current: scenario.resourceUsage.heapUsedDelta.average,
          baseline: baselineScenario.resourceUsage.heapUsedDelta.average,
          change: calculatePercentageChange(scenario.resourceUsage.heapUsedDelta.average, baselineScenario.resourceUsage.heapUsedDelta.average),
          improved: scenario.resourceUsage.heapUsedDelta.average < baselineScenario.resourceUsage.heapUsedDelta.average
        },
        rssDelta: {
          current: scenario.resourceUsage.rssDelta.average,
          baseline: baselineScenario.resourceUsage.rssDelta.average,
          change: calculatePercentageChange(scenario.resourceUsage.rssDelta.average, baselineScenario.resourceUsage.rssDelta.average),
          improved: scenario.resourceUsage.rssDelta.average < baselineScenario.resourceUsage.rssDelta.average
        }
      };
    }
  }
  
  return comparison;
};

const printComparison = (comparison) => {
  if (!comparison) {
    console.log('\n📊 No baseline available for comparison');
    return;
  }
  
  console.log('\n📊 Performance Comparison vs Baseline:');
  console.log('─'.repeat(60));
  
  for (const [scenarioKey, metrics] of Object.entries(comparison)) {
    console.log(`\n${scenarioKey}:`);
    
    const rpsStatus = metrics.rps.improved ? '✅' : '❌';
    const latencyStatus = metrics.latencyP95Ms.improved ? '✅' : '❌';
    
    console.log(`  ${rpsStatus} RPS: ${metrics.rps.current.toFixed(2)} vs ${metrics.rps.baseline.toFixed(2)} (${formatPercentageChange(metrics.rps.change)})`);
    console.log(`  ${latencyStatus} P95 Latency: ${metrics.latencyP95Ms.current.toFixed(2)}ms vs ${metrics.latencyP95Ms.baseline.toFixed(2)}ms (${formatPercentageChange(metrics.latencyP95Ms.change)})`);
    console.log(`  P99 Latency: ${metrics.latencyP99Ms.current.toFixed(2)}ms vs ${metrics.latencyP99Ms.baseline.toFixed(2)}ms (${formatPercentageChange(metrics.latencyP99Ms.change)})`);
    console.log(`  Success Rate: ${(metrics.successRate.current * 100).toFixed(2)}% vs ${(metrics.successRate.baseline * 100).toFixed(2)}% (${formatPercentageChange(metrics.successRate.change)})`);
    
    if (metrics.memory) {
      const memoryStatus = metrics.memory.heapUsedDelta.improved ? '✅' : '❌';
      console.log(`  ${memoryStatus} Memory Delta: ${metrics.memory.heapUsedDelta.current.toFixed(2)}MB vs ${metrics.memory.heapUsedDelta.baseline.toFixed(2)}MB (${formatPercentageChange(metrics.memory.heapUsedDelta.change)})`);
    }
  }
  
  console.log('\n' + '─'.repeat(60));
};

const prepareStorageFixtures = async () => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'oc-benchmark-storage-')
  );
  const componentsDir = path.join(root, 'components');

  const batchSources = new Map();
  for (const name of BATCH_SOURCE_COMPONENTS) {
    const componentPath = path.resolve('test/fixtures/components', name);
    batchSources.set(name, await ensurePackaged(componentPath));
  }

  const componentsToCopy = [
    {
      name: 'welcome-with-plugin',
      source: path.resolve(
        'test/fixtures/benchmark-components/welcome-with-plugin/_package'
      )
    },
    ...BATCH_COMPONENT_NAMES.map((name) => {
      const sourceName = BATCH_SOURCE_COMPONENTS.find((candidate) =>
        name.startsWith(`${candidate}-benchmark-`)
      );
      return { name, source: batchSources.get(sourceName), rewriteName: true };
    }),
    {
      name: 'oc-client',
      source: path.resolve('dist/components/oc-client/_package')
    }
  ];

  for (const component of componentsToCopy) {
    const pkg = await readJson(path.join(component.source, 'package.json'));
    const version = pkg.version;
    const destination = path.join(componentsDir, component.name, version);
    await copyDirectory(component.source, destination);
    if (component.rewriteName) {
      await writeJson(path.join(destination, 'package.json'), {
        ...pkg,
        name: component.name
      });
    }
  }

  return {
    root,
    componentsDir: 'components',
    dispose: async () => {
      await fs.promises.rm(root, { recursive: true, force: true }).catch(() => {});
    }
  };
};

const runBombardier = ({ url, options }) =>
  new Promise((resolve, reject) => {
    const args = [
      '-o',
      'json',
      '-p',
      'result',
      '-l',
      '-c',
      String(options.connections),
      '-d',
      options.duration,
      '-t',
      options.timeout,
      '-m',
      options.method
    ];

    if (options.disableKeepAlives) args.push('-a');
    if (options.rate && options.rate > 0) {
      args.push('-r', String(options.rate));
    }
    if (options.requests && options.requests > 0) {
      args.push('-n', String(options.requests));
    }
    for (const header of options.headers || []) {
      args.push('-H', header);
    }
    if (options.body) {
      args.push('-b', options.body);
    }
    args.push(url);

    const child = spawn('bombardier', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(
          new Error(`bombardier exited with code ${code}\n${stderr || stdout}`)
        );
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        return reject(new Error('bombardier returned empty output'));
      }

      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch (error) {
        return reject(
          new Error(`failed to parse bombardier JSON output: ${trimmed}`)
        );
      }

      resolve({ args, raw: parsed, stderr: stderr.trim() });
    });
  });

const aggregate = (runs) => {
  const metric = (selector) => runs.map((run) => selector(run.metrics));
  const average = (values) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const min = (values) => Math.min(...values);
  const max = (values) => Math.max(...values);

  const rps = metric((m) => m.rpsMean);
  const latencyP95Ms = metric((m) => m.latencyP95Ms);
  const latencyP99Ms = metric((m) => m.latencyP99Ms);
  const latencyMeanMs = metric((m) => m.latencyMeanMs);
  const successRate = metric((m) => m.successRate);

  return {
    samples: runs.length,
    rps: {
      average: average(rps),
      min: min(rps),
      max: max(rps)
    },
    latencyP95Ms: {
      average: average(latencyP95Ms),
      min: min(latencyP95Ms),
      max: max(latencyP95Ms)
    },
    latencyP99Ms: {
      average: average(latencyP99Ms),
      min: min(latencyP99Ms),
      max: max(latencyP99Ms)
    },
    latencyMeanMs: {
      average: average(latencyMeanMs),
      min: min(latencyMeanMs),
      max: max(latencyMeanMs)
    },
    successRate: {
      average: average(successRate),
      min: min(successRate),
      max: max(successRate)
    }
  };
};

const toMsFromMicroseconds = (value) => Number(value || 0) / 1000;

const mapBombardierResult = (result) => {
  const totalRequests =
    Number(result.req1xx || 0) +
    Number(result.req2xx || 0) +
    Number(result.req3xx || 0) +
    Number(result.req4xx || 0) +
    Number(result.req5xx || 0) +
    Number(result.others || 0);
  const successRequests = Number(result.req2xx || 0) + Number(result.req3xx || 0);

  return {
    totalRequests,
    successRequests,
    req2xx: Number(result.req2xx || 0),
    req4xx: Number(result.req4xx || 0),
    req5xx: Number(result.req5xx || 0),
    rpsMean: Number(result.rps?.mean || 0),
    rpsMax: Number(result.rps?.max || 0),
    latencyMeanMs: toMsFromMicroseconds(result.latency?.mean),
    latencyP95Ms: toMsFromMicroseconds(result.latency?.percentiles?.['95']),
    latencyP99Ms: toMsFromMicroseconds(result.latency?.percentiles?.['99']),
    latencyMaxMs: toMsFromMicroseconds(result.latency?.max),
    successRate: totalRequests > 0 ? successRequests / totalRequests : 0
  };
};

const summarizeStorageWork = (storageMetrics, successfulRequests) => {
  const operations = storageMetrics.completedOperations;
  const byOperation = { ...operations.byOperation };
  const raw = {
    publicReads: operations.total,
    byOperation,
    packageManifestReads: 0,
    providerReads: 0,
    templateReads: 0,
    envReads: 0
  };
  for (const [filePath, counts] of Object.entries(operations.byPath)) {
    const fileName = path.posix.basename(filePath);
    if (fileName === 'package.json') {
      raw.packageManifestReads += counts.byOperation.getJson;
    } else if (fileName === 'server.js') {
      raw.providerReads += counts.byOperation.getFile;
    } else if (fileName === 'template.js') {
      raw.templateReads += counts.byOperation.getFile;
    } else if (fileName === '.env') {
      raw.envReads += counts.byOperation.getFile;
    }
  }
  const normalize = (value) =>
    successfulRequests > 0 ? value / successfulRequests : null;
  return {
    successfulRequests,
    raw,
    perSuccessfulRequest: {
      publicReads: normalize(raw.publicReads),
      byOperation: Object.fromEntries(
        Object.entries(byOperation).map(([operation, count]) => [
          operation,
          normalize(count)
        ])
      ),
      packageManifestReads: normalize(raw.packageManifestReads),
      providerReads: normalize(raw.providerReads),
      templateReads: normalize(raw.templateReads),
      envReads: normalize(raw.envReads)
    },
    peakConcurrentReads: storageMetrics.peakConcurrentReads
  };
};

const aggregateStorageWork = (runs) => {
  const measured = runs.filter((run) => run.storageWork);
  if (measured.length === 0) return null;
  const byOperation = {
    getFile: 0,
    getJson: 0,
    listSubDirectories: 0
  };
  const raw = {
    successfulRequests: 0,
    publicReads: 0,
    byOperation,
    packageManifestReads: 0,
    providerReads: 0,
    templateReads: 0,
    envReads: 0
  };
  for (const run of measured) {
    raw.successfulRequests += run.storageWork.successfulRequests;
    raw.publicReads += run.storageWork.raw.publicReads;
    raw.packageManifestReads += run.storageWork.raw.packageManifestReads;
    raw.providerReads += run.storageWork.raw.providerReads;
    raw.templateReads += run.storageWork.raw.templateReads;
    raw.envReads += run.storageWork.raw.envReads;
    for (const operation of Object.keys(byOperation)) {
      byOperation[operation] += run.storageWork.raw.byOperation[operation];
    }
  }
  const normalize = (value) =>
    raw.successfulRequests > 0 ? value / raw.successfulRequests : null;
  const peaks = measured.map((run) => run.storageWork.peakConcurrentReads);
  return {
    rawTotals: raw,
    perSuccessfulRequest: {
      publicReads: normalize(raw.publicReads),
      byOperation: Object.fromEntries(
        Object.entries(byOperation).map(([operation, count]) => [
          operation,
          normalize(count)
        ])
      ),
      packageManifestReads: normalize(raw.packageManifestReads),
      providerReads: normalize(raw.providerReads),
      templateReads: normalize(raw.templateReads),
      envReads: normalize(raw.envReads)
    },
    peakConcurrentReads: {
      average: peaks.reduce((sum, value) => sum + value, 0) / peaks.length,
      min: Math.min(...peaks),
      max: Math.max(...peaks)
    }
  };
};

const createPlugin = () => ({
  name: 'appendSuffix',
  description: 'Benchmark plugin used to emulate plugin execution in requests',
  register: {
    register: (_options, _deps, done) => done(),
    execute: (value, suffix) => `${value}${suffix}`
  }
});

const startRegistry = async (scenario, options) => {
  const port = await getPortAsync();
  const baseUrl = `http://127.0.0.1:${port}/`;

  const commonOptions = {
    baseUrl,
    port,
    prefix: '/',
    discovery: false,
    verbosity: 0
  };

  let registryOptions;
  let storageAdapter;
  let disposeFixtures = async () => {};
  if (scenario === 'local-memory' || scenario === 'high-load-local') {
    registryOptions = {
      ...commonOptions,
      local: true,
      hotReloading: false,
      path: path.resolve('test/fixtures/components')
    };
  } else if (
    scenario === 'storage-simulated' ||
    scenario === 'high-load-storage' ||
    scenario === 'batch-storage'
  ) {
    const preparedFixtures = await prepareStorageFixtures();
    const fixturesRoot = preparedFixtures.root;
    const componentsDir = preparedFixtures.componentsDir;
    disposeFixtures = preparedFixtures.dispose;

    registryOptions = {
      ...commonOptions,
      local: false,
      storage: {
        adapter: (storageOptions) => {
          storageAdapter = createStorageAdapter({
            ...storageOptions,
            fixturesRoot,
            minLatencyMs: options.storageMinLatencyMs,
            maxLatencyMs: options.storageMaxLatencyMs,
            maxConcurrentRequests: options.storageMaxConcurrentRequests
          });
          return storageAdapter;
        },
        options: {
          componentsDir,
          fixturesRoot
        }
      },
      dependencies: ['lodash.isequal']
    };
  } else {
    throw new Error(`Unknown scenario: ${scenario}`);
  }

  let registry;
  try {
    registry = oc.Registry(registryOptions);
    registry.register(createPlugin());

    await new Promise((resolve, reject) => {
      registry.start((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  } catch (error) {
    await disposeFixtures();
    throw error;
  }

  return {
    registry,
    baseUrl,
    getStorageMetrics: () => storageAdapter?.getMetrics(),
    resetStorageMetrics: () => storageAdapter?.resetMetrics(),
    close: async () => {
      await new Promise((resolve, reject) => {
        registry.close((error) => {
          if (error) return reject(error);
          resolve();
        });
      });
      await disposeFixtures();
    }
  };
};

const buildScenarios = () => [
  {
    key: 'local-memory',
    title: 'Local memory path (warm cache)',
    urlPath: '/welcome/1.0.0?firstName=Jane&lastName=Doe'
  },
  {
    key: 'storage-simulated',
    title: 'Simulated storage path + plugin execution',
    urlPath: '/welcome-with-plugin/1.0.0?firstName=Jane&lastName=Doe&suffix=-Bench'
  },
  {
    key: 'batch-storage',
    title: 'Batch route fan-out (simulated storage)',
    urlPath: '/',
    method: 'POST',
    headers: ['Content-Type: application/json'],
    body: JSON.stringify({
      components: BATCH_COMPONENT_NAMES.map((name) => ({
        name,
        version: '1.0.0'
      }))
    })
  },
  {
    key: 'high-load-local',
    title: 'High load local memory path',
    urlPath: '/welcome/1.0.0?firstName=Jane&lastName=Doe',
    highLoad: true
  },
  {
    key: 'high-load-storage',
    title: 'High load storage path + plugin execution',
    urlPath: '/welcome-with-plugin/1.0.0?firstName=Jane&lastName=Doe&suffix=-Bench',
    highLoad: true
  }
];

const benchmarkScenario = async ({ scenario, options }) => {
  const scenarioResult = {
    key: scenario.key,
    title: scenario.title,
    workload: {
      repetitions: options.repetitions,
      connections: options.connections,
      duration: options.duration,
      timeout: options.timeout,
      requests: options.requests,
      rate: options.rate,
      disableKeepAlives: options.disableKeepAlives,
      headers: [...options.headers, ...(scenario.headers || [])],
      request: {
        method: scenario.method || 'GET',
        body: scenario.body ?? null
      },
      storage: {
        minLatencyMs: options.storageMinLatencyMs,
        maxLatencyMs: options.storageMaxLatencyMs,
        maxConcurrentRequests: options.storageMaxConcurrentRequests
      }
    },
    runs: [],
    aggregate: null,
    resourceUsage: null
  };

  const server = await startRegistry(scenario.key, options);
  const url = `${server.baseUrl.replace(/\/$/, '')}${scenario.urlPath}`;
  const resourceMeasurements = [];
  const storageMeasurements = [];

  try {
    if (scenario.body) {
      const response = await fetch(url, {
        method: scenario.method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: scenario.body
      });
      const results = await response.json();
      if (
        !response.ok ||
        !Array.isArray(results) ||
        results.length !== BATCH_COMPONENT_NAMES.length ||
        results.some((result) => result.status !== 200)
      ) {
        throw new Error(
          `Batch fixture preflight failed: HTTP ${response.status} ${JSON.stringify(results)}`
        );
      }
      console.log(
        `[${scenario.key}] preflight: ${results.length} distinct components returned 200`
      );
    }
    for (let attempt = 1; attempt <= options.repetitions; attempt += 1) {
      server.resetStorageMetrics();
      const monitoring = startResourceMonitoring();

      const run = await runBombardier({
        url,
        options: {
          connections: options.connections,
          duration: options.duration,
          timeout: options.timeout,
          method: scenario.method || 'GET',
          body: scenario.body,
          requests: options.requests,
          rate: options.rate,
          disableKeepAlives: options.disableKeepAlives,
          headers: [...options.headers, ...(scenario.headers || [])]
        }
      });
      
      const resourceDelta = monitoring.getDelta();
      const storageMetrics = server.getStorageMetrics();
      const metrics = mapBombardierResult(run.raw.result);
      const storageWork = storageMetrics
        ? summarizeStorageWork(storageMetrics, metrics.successRequests)
        : null;
      resourceMeasurements.push(resourceDelta);
      if (storageMetrics) storageMeasurements.push(storageMetrics);

      const runResult = {
        attempt,
        command: `bombardier ${run.args.join(' ')}`,
        metrics,
        rawResult: run.raw.result,
        resourceUsage: resourceDelta,
        storageMetrics,
        storageWork
      };

      scenarioResult.runs.push(runResult);

      const rps = metrics.rpsMean.toFixed(2);
      const p95 = metrics.latencyP95Ms.toFixed(2);
      const p99 = metrics.latencyP99Ms.toFixed(2);
      const mem = resourceDelta.memory.heapUsedDelta.toFixed(2);
      const ok = (metrics.successRate * 100).toFixed(2);
      const storagePeak = storageMetrics?.peakConcurrentReads ?? 'n/a';
      console.log(
        `[${scenario.key}] run ${attempt}/${options.repetitions} | rps=${rps} | p95=${p95}ms | p99=${p99}ms | mem=${mem}MB | storagePeak=${storagePeak} | success=${ok}%`
      );
    }
  } finally {
    await server.close().catch(() => {});
  }

  // Aggregate resource usage
  const aggregateResourceUsage = {
    heapUsedDelta: {
      average: resourceMeasurements.reduce((sum, m) => sum + m.memory.heapUsedDelta, 0) / resourceMeasurements.length,
      min: Math.min(...resourceMeasurements.map(m => m.memory.heapUsedDelta)),
      max: Math.max(...resourceMeasurements.map(m => m.memory.heapUsedDelta))
    },
    heapTotalDelta: {
      average: resourceMeasurements.reduce((sum, m) => sum + m.memory.heapTotalDelta, 0) / resourceMeasurements.length,
      min: Math.min(...resourceMeasurements.map(m => m.memory.heapTotalDelta)),
      max: Math.max(...resourceMeasurements.map(m => m.memory.heapTotalDelta))
    },
    rssDelta: {
      average: resourceMeasurements.reduce((sum, m) => sum + m.memory.rssDelta, 0) / resourceMeasurements.length,
      min: Math.min(...resourceMeasurements.map(m => m.memory.rssDelta)),
      max: Math.max(...resourceMeasurements.map(m => m.memory.rssDelta))
    },
    cpuUserTimeDelta: {
      average: resourceMeasurements.reduce((sum, m) => sum + m.cpu.userTimeDelta, 0) / resourceMeasurements.length,
      min: Math.min(...resourceMeasurements.map(m => m.cpu.userTimeDelta)),
      max: Math.max(...resourceMeasurements.map(m => m.cpu.userTimeDelta))
    },
    cpuSystemTimeDelta: {
      average: resourceMeasurements.reduce((sum, m) => sum + m.cpu.systemTimeDelta, 0) / resourceMeasurements.length,
      min: Math.min(...resourceMeasurements.map(m => m.cpu.systemTimeDelta)),
      max: Math.max(...resourceMeasurements.map(m => m.cpu.systemTimeDelta))
    }
  };
  
  scenarioResult.resourceUsage = aggregateResourceUsage;
  if (storageMeasurements.length) {
    const peaks = storageMeasurements.map((metrics) =>
      metrics.peakConcurrentReads
    );
    scenarioResult.storageConcurrency = {
      average: peaks.reduce((sum, value) => sum + value, 0) / peaks.length,
      min: Math.min(...peaks),
      max: Math.max(...peaks)
    };
  }
  scenarioResult.storageWork = aggregateStorageWork(scenarioResult.runs);
  scenarioResult.aggregate = aggregate(scenarioResult.runs);
  return scenarioResult;
};

const parseArguments = (argv) => {
  const args = {};
  for (const entry of argv) {
    if (!entry.startsWith('--')) continue;
    const argument = entry.replace(/^--/, '');
    const separator = argument.indexOf('=');
    const rawKey = separator === -1 ? argument : argument.slice(0, separator);
    const rawValue = separator === -1 ? 'true' : argument.slice(separator + 1);
    if (!rawKey) continue;
    args[rawKey] = rawValue;
  }

  return args;
};

const selectScenarios = (selected) => {
  const all = buildScenarios();
  if (!selected || selected.length === 0) {
    // By default, exclude high-load scenarios (they take longer)
    return all.filter((scenario) => !scenario.highLoad);
  }
  const selectedSet = new Set(selected);
  return all.filter((scenario) => selectedSet.has(scenario.key));
};

const getAssertionOptions = (args) => ({
  expectedPackageReads: parseExpectedPackageReads(
    args['expect-package-reads']
  ),
  expectedSuccessRate: parseOptionalNonnegativeNumber(
    args['expect-success-rate'],
    'expect-success-rate'
  ),
  maxRpsRegressionPercent: parseOptionalNonnegativeNumber(
    args['max-rps-regression-percent'],
    'max-rps-regression-percent'
  ),
  maxP95RegressionPercent: parseOptionalNonnegativeNumber(
    args['max-p95-regression-percent'],
    'max-p95-regression-percent'
  )
});

const getResultScenarioKeys = (result, requestedKeys) => {
  const available = new Set(result.scenarios?.map((scenario) => scenario.key));
  const selected = requestedKeys.length
    ? requestedKeys
    : result.scenarios?.map((scenario) => scenario.key) || [];
  const unknown = selected.filter((key) => !available.has(key));
  if (unknown.length) {
    throw new Error(`Unknown result scenarios: ${unknown.join(', ')}`);
  }
  return selected;
};

const main = async () => {
  const args = parseArguments(process.argv.slice(2));
  const assertionOptions = getAssertionOptions(args);
  const selectedScenarioKeys = parseList(args.scenarios);
  if (args['verify-result-file']) {
    const current = await readJson(path.resolve(args['verify-result-file']));
    const previousBaseline = args['baseline-file']
      ? await readJson(path.resolve(args['baseline-file']))
      : null;
    const scenarioKeys = getResultScenarioKeys(current, selectedScenarioKeys);
    applyBenchmarkAssertions({
      current,
      baseline: previousBaseline,
      scenarioKeys,
      ...assertionOptions
    });
    printComparison(compareWithBaseline(current, previousBaseline));
    console.log(`\nVerified benchmark result: ${path.resolve(args['verify-result-file'])}`);
    return;
  }

  const parsedHeaders = parseList(args.headers);
  const scenarios = selectScenarios(selectedScenarioKeys);
  const availableScenarioKeys = new Set(
    buildScenarios().map((scenario) => scenario.key)
  );
  const unknownScenarios = selectedScenarioKeys.filter(
    (key) => !availableScenarioKeys.has(key)
  );

  if (scenarios.length === 0 || unknownScenarios.length) {
    throw new Error(
      `No valid scenarios selected. Available scenarios: ${buildScenarios()
        .map((scenario) => scenario.key)
        .join(', ')}`
    );
  }

  const baseOptions = {
    repetitions: parseInteger(args.repetitions, DEFAULT_REPETITIONS),
    connections: parseInteger(args.connections, 100),
    duration: args.duration || '15s',
    timeout: args.timeout || '5s',
    requests: parseInteger(args.requests, 0),
    rate: parseInteger(args.rate, 0),
    disableKeepAlives:
      args['disable-keep-alives'] === 'true' ||
      args['disable-keep-alives'] === '1',
    headers: parsedHeaders.length > 0 ? parsedHeaders : DEFAULT_HEADERS,
    outDir: path.resolve(args['out-dir'] || DEFAULT_OUT_DIR),
    storageMinLatencyMs: parseNumber(args['storage-min-latency-ms'], 8),
    storageMaxLatencyMs: parseNumber(args['storage-max-latency-ms'], 30),
    storageMaxConcurrentRequests: parseInteger(
      args['storage-max-concurrency'],
      128
    )
  };
  const explicitResultPath = args['result-file']
    ? path.resolve(args['result-file'])
    : null;
  const explicitBaselinePath = args['baseline-file']
    ? path.resolve(args['baseline-file'])
    : null;
  if (
    explicitResultPath &&
    explicitBaselinePath &&
    explicitResultPath === explicitBaselinePath
  ) {
    throw new Error('result-file and baseline-file must be different paths');
  }
  // Load previous baseline for comparison
  const previousBaseline = explicitBaselinePath
    ? await readJson(explicitBaselinePath)
    : null; // No previous baseline exists

  const getScenarioOptions = (scenario) => {
    if (scenario.highLoad) {
      return {
        ...baseOptions,
        connections: parseInteger(args['high-load-connections'], 200), // Reduced from 500 to 200
        duration: args['high-load-duration'] || '30s', // Reduced from 60s to 30s
        repetitions: parseInteger(args['high-load-repetitions'], 2) // Reduced from 3 to 2
      };
    }
    return baseOptions;
  };

  const hostname = os.hostname();
  const baseline = {
    createdAt: new Date().toISOString(),
    host: hostname,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    benchmarkVersion: 3,
    options: {
      repetitions: baseOptions.repetitions,
      connections: baseOptions.connections,
      duration: baseOptions.duration,
      timeout: baseOptions.timeout,
      requests: baseOptions.requests,
      rate: baseOptions.rate,
      disableKeepAlives: baseOptions.disableKeepAlives,
      headers: baseOptions.headers,
      storageMinLatencyMs: baseOptions.storageMinLatencyMs,
      storageMaxLatencyMs: baseOptions.storageMaxLatencyMs,
      storageMaxConcurrentRequests: baseOptions.storageMaxConcurrentRequests
    },
    scenarios: []
  };

  for (const scenario of scenarios) {
    console.log(`\nRunning scenario: ${scenario.title} (${scenario.key})`);
    const scenarioOptions = getScenarioOptions(scenario);
    const scenarioResult = await benchmarkScenario({ scenario, options: scenarioOptions });
    baseline.scenarios.push(scenarioResult);
  }

  const timestamp = nowIsoCompact();
  const fileName = `server-benchmark-${timestamp}.json`;
  const outputPath = path.join(baseOptions.outDir, fileName);
  await writeJson(outputPath, baseline);

  const latestPath = path.join(baseOptions.outDir, 'server-benchmark-latest.json');
  await writeJson(latestPath, baseline);
  if (explicitResultPath) await writeJson(explicitResultPath, baseline);

  console.log(
    `\nSaved benchmark baseline:\n- ${outputPath}\n- ${latestPath}${
      explicitResultPath ? `\n- ${explicitResultPath}` : ''
    }`
  );

  const previousBaselinePath = path.join(baseOptions.outDir, 'server-benchmark-baseline.json');

  applyBenchmarkAssertions({
    current: baseline,
    baseline: previousBaseline,
    scenarioKeys: baseline.scenarios.map((scenario) => scenario.key),
    ...assertionOptions
  });

  // Compare with previous baseline
  const comparison = compareWithBaseline(baseline, previousBaseline);
  printComparison(comparison);

  // Print summary with resource usage
  for (const scenario of baseline.scenarios) {
    const aggregateResult = scenario.aggregate;
    const rps = aggregateResult.rps;
    const p95 = aggregateResult.latencyP95Ms;
    const p99 = aggregateResult.latencyP99Ms;
    const success = aggregateResult.successRate;
    const resourceUsage = scenario.resourceUsage;
    
    console.log(
      `\n[${scenario.key}] samples=${aggregateResult.samples} | rps(avg/min/max)=${rps.average.toFixed(2)}/${rps.min.toFixed(2)}/${rps.max.toFixed(2)} | p95ms(avg/min/max)=${p95.average.toFixed(2)}/${p95.min.toFixed(2)}/${p95.max.toFixed(2)} | p99ms(avg/min/max)=${p99.average.toFixed(2)}/${p99.min.toFixed(2)}/${p99.max.toFixed(2)} | success(avg)=${(success.average * 100).toFixed(2)}%`
    );
    
    if (scenario.storageConcurrency) {
      const storage = scenario.storageConcurrency;
      console.log(
        `  Storage peak concurrency(avg/min/max)=${storage.average.toFixed(2)}/${storage.min}/${storage.max}`
      );
    }

    if (scenario.storageWork) {
      const raw = scenario.storageWork.rawTotals;
      const normalized = scenario.storageWork.perSuccessfulRequest;
      const formatNormalized = (value) =>
        value === null ? 'n/a' : value.toFixed(6);
      console.log(
        `  Storage work total/per-success: public=${raw.publicReads}/${formatNormalized(normalized.publicReads)} | package=${raw.packageManifestReads}/${formatNormalized(normalized.packageManifestReads)} | provider=${raw.providerReads}/${formatNormalized(normalized.providerReads)} | template=${raw.templateReads}/${formatNormalized(normalized.templateReads)} | env=${raw.envReads}/${formatNormalized(normalized.envReads)}`
      );
    }

    if (resourceUsage) {
      console.log(
        `  Memory: heapUsed(avg/min/max)=${resourceUsage.heapUsedDelta.average.toFixed(2)}/${resourceUsage.heapUsedDelta.min.toFixed(2)}/${resourceUsage.heapUsedDelta.max.toFixed(2)}MB | rss(avg/min/max)=${resourceUsage.rssDelta.average.toFixed(2)}/${resourceUsage.rssDelta.min.toFixed(2)}/${resourceUsage.rssDelta.max.toFixed(2)}MB`
      );
      console.log(
        `  CPU: userTime(avg/min/max)=${resourceUsage.cpuUserTimeDelta.average.toFixed(2)}/${resourceUsage.cpuUserTimeDelta.min.toFixed(2)}/${resourceUsage.cpuUserTimeDelta.max.toFixed(2)}s | systemTime(avg/min/max)=${resourceUsage.cpuSystemTimeDelta.average.toFixed(2)}/${resourceUsage.cpuSystemTimeDelta.min.toFixed(2)}/${resourceUsage.cpuSystemTimeDelta.max.toFixed(2)}s`
      );
    }
  }
  
  // Ask user if they want to update the baseline
  if (args['update-baseline'] === 'true' || args['update-baseline'] === '1') {
    await writeJson(previousBaselinePath, baseline);
    console.log(`\n✅ Updated baseline: ${previousBaselinePath}`);
  } else {
    console.log(`\n💡 To set this run as the new baseline, run with --update-baseline=true`);
  }
  
  // Ensure process exits cleanly
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
