const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { promisify } = require('node:util');
const getPort = require('getport');

const createStorageAdapter = require('./storage-adapter');
const createAzuriteStorageAdapter = require('./azure-storage-adapter');
const { startAzurite } = require('./azurite-server');
const { generateAndUploadComponents } = require('./generate-components');
const oc = require('../../dist');

const getPortAsync = promisify(getPort);

const DEFAULT_OUT_DIR = path.resolve(__dirname, '../../test/results/benchmarks');
const DEFAULT_REPETITIONS = 5;
const DEFAULT_HEADERS = ['Accept: application/json'];

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

const buildBatchComponentBody = (firstComponentName, batchSize = 50) => {
  const components = [];
  const match = firstComponentName.match(/^(.*-)(\d+)$/);
  const prefix = match ? match[1] : 'stress-component-';
  const startIndex = match ? Number.parseInt(match[2], 10) : 1;

  for (let i = 0; i < batchSize; i += 1) {
    const index = startIndex + i;
    const componentName = `${prefix}${String(index).padStart(3, '0')}`;
    components.push({
      name: componentName,
      version: '1.0.0',
      parameters: {
        firstName: 'Jane',
        lastName: 'Doe'
      }
    });
  }

  return JSON.stringify({ components });
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
  const peakMemory = { ...baseline.memory };

  const sampleInterval = setInterval(() => {
    const usage = process.memoryUsage();
    peakMemory.heapUsed = Math.max(peakMemory.heapUsed, Math.round(usage.heapUsed / 1024 / 1024));
    peakMemory.heapTotal = Math.max(peakMemory.heapTotal, Math.round(usage.heapTotal / 1024 / 1024));
    peakMemory.rss = Math.max(peakMemory.rss, Math.round(usage.rss / 1024 / 1024));
    peakMemory.external = Math.max(peakMemory.external, Math.round(usage.external / 1024 / 1024));
  }, 500);

  return {
    baseline,
    startTime,
    getDelta: () => {
      clearInterval(sampleInterval);
      const current = getResourceUsage();
      const endTime = process.hrtime.bigint();
      const elapsedMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      return {
        memory: {
          heapUsedDelta: current.memory.heapUsed - baseline.memory.heapUsed,
          heapTotalDelta: current.memory.heapTotal - baseline.memory.heapTotal,
          rssDelta: current.memory.rss - baseline.memory.rss,
          peakHeapUsed: peakMemory.heapUsed,
          peakHeapTotal: peakMemory.heapTotal,
          peakRss: peakMemory.rss,
          peakExternal: peakMemory.external
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
      latencyMeanMs: {
        current: currentAggregate.latencyMeanMs.average,
        baseline: baselineAggregate.latencyMeanMs.average,
        change: calculatePercentageChange(currentAggregate.latencyMeanMs.average, baselineAggregate.latencyMeanMs.average),
        improved: currentAggregate.latencyMeanMs.average < baselineAggregate.latencyMeanMs.average
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

      if (baseline.benchmarkVersion >= 3) {
        comparison[scenario.key].memory.peakHeapUsed = {
          current: scenario.resourceUsage.peakHeapUsed.average,
          baseline: baselineScenario.resourceUsage.peakHeapUsed.average,
          change: calculatePercentageChange(scenario.resourceUsage.peakHeapUsed.average, baselineScenario.resourceUsage.peakHeapUsed.average),
          improved: scenario.resourceUsage.peakHeapUsed.average < baselineScenario.resourceUsage.peakHeapUsed.average
        };
      }
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
    console.log(`  P99 Latency: ${metrics.latencyMeanMs.current.toFixed(2)}ms vs ${metrics.latencyMeanMs.baseline.toFixed(2)}ms (${formatPercentageChange(metrics.latencyMeanMs.change)})`);
    console.log(`  Success Rate: ${(metrics.successRate.current * 100).toFixed(2)}% vs ${(metrics.successRate.baseline * 100).toFixed(2)}% (${formatPercentageChange(metrics.successRate.change)})`);
    
    if (metrics.memory) {
      const memoryStatus = metrics.memory.heapUsedDelta.improved ? '✅' : '❌';
      console.log(`  ${memoryStatus} Memory Delta: ${metrics.memory.heapUsedDelta.current.toFixed(2)}MB vs ${metrics.memory.heapUsedDelta.baseline.toFixed(2)}MB (${formatPercentageChange(metrics.memory.heapUsedDelta.change)})`);
      if (metrics.memory.peakHeapUsed) {
        const peakStatus = metrics.memory.peakHeapUsed.improved ? '✅' : '❌';
        console.log(`  ${peakStatus} Peak Heap: ${metrics.memory.peakHeapUsed.current.toFixed(2)}MB vs ${metrics.memory.peakHeapUsed.baseline.toFixed(2)}MB (${formatPercentageChange(metrics.memory.peakHeapUsed.change)})`);
      }
    }
  }
  
  console.log('\n' + '─'.repeat(60));
};

const prepareStorageFixtures = async () => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'oc-benchmark-storage-')
  );
  const componentsDir = path.join(root, 'components');

  const componentsToCopy = [
    {
      name: 'welcome-with-plugin',
      packagePath: path.resolve(
        __dirname,
        '../../test/fixtures/benchmark-components/welcome-with-plugin/_package/package.json'
      ),
      source: path.resolve(
        __dirname,
        '../../test/fixtures/benchmark-components/welcome-with-plugin/_package'
      )
    },
    {
      name: 'oc-client',
      packagePath: path.resolve(
        __dirname,
        '../../dist/components/oc-client/_package/package.json'
      ),
      source: path.resolve(__dirname, '../../dist/components/oc-client/_package')
    }
  ];

  for (const component of componentsToCopy) {
    const pkg = await readJson(component.packagePath);
    const version = pkg.version;
    const destination = path.join(componentsDir, component.name, version);
    await copyDirectory(component.source, destination);
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
    if (options.body) {
      args.push('-b', options.body);
    }
    for (const header of options.headers || []) {
      args.push('-H', header);
    }
    if (options.body && !options.headers?.some((h) => h.toLowerCase().startsWith('content-type'))) {
      args.push('-H', 'Content-Type: application/json');
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
  let disposeFixtures = async () => {};
  let generated;
  if (scenario === 'local-memory' || scenario === 'high-load-local') {
    registryOptions = {
      ...commonOptions,
      local: true,
      hotReloading: false,
      path: path.resolve(__dirname, '../../test/fixtures/components')
    };
  } else if (scenario === 'storage-simulated' || scenario === 'high-load-storage') {
    const preparedFixtures = await prepareStorageFixtures();
    const fixturesRoot = preparedFixtures.root;
    const componentsDir = preparedFixtures.componentsDir;
    disposeFixtures = preparedFixtures.dispose;

    registryOptions = {
      ...commonOptions,
      local: false,
      storage: {
        adapter: (storageOptions) =>
          createStorageAdapter({
            ...storageOptions,
            fixturesRoot,
            minLatencyMs: options.storageMinLatencyMs,
            maxLatencyMs: options.storageMaxLatencyMs,
            maxConcurrentRequests: options.storageMaxConcurrentRequests
          }),
        options: {
          componentsDir,
          fixturesRoot
        }
      },
      dependencies: []
    };
  } else if (
    scenario.startsWith('azurite-')
  ) {
    const azurite = await startAzurite({
      port: options.azuritePort,
      inMemoryPersistence: options.azuriteInMemoryPersistence,
      silent: true
    });

    const publicContainerName = 'oc-public';
    const privateContainerName = 'oc-private';
    const componentsDir = 'components';
    const azuritePath = `//127.0.0.1:${azurite.port}/${azurite.accountName}/${publicContainerName}/`;

    const storageAdapter = createAzuriteStorageAdapter({
      endpoint: azurite.endpoint,
      accountName: azurite.accountName,
      accountKey: azurite.accountKey,
      publicContainerName,
      privateContainerName,
      componentsDir,
      maxConcurrentRequests: options.storageMaxConcurrentRequests
    });

    // Ensure containers exist before uploading.
    await storageAdapter.getClient().publicClient.createIfNotExists({
      access: 'blob'
    });
    await storageAdapter.getClient().privateClient.createIfNotExists();

    const ocPackageInfo = JSON.parse(
      await fs.promises.readFile(
        path.join(__dirname, '..', '..', 'package.json'),
        'utf8'
      )
    );
    generated = await generateAndUploadComponents({
      count: options.azuriteComponentCount,
      storageAdapter,
      componentsDir,
      ocClientVersion: ocPackageInfo.version
    });

    disposeFixtures = async () => {
      await generated.dispose().catch(() => {});
      await azurite.stop().catch(() => {});
    };

    registryOptions = {
      ...commonOptions,
      local: false,
      discovery: {
        ui: false,
        api: true,
        experimental: false,
        validate: false,
        robots: true
      },
      storage: {
        adapter: () => storageAdapter,
        options: {
          componentsDir,
          path: azuritePath,
          publicContainerName,
          privateContainerName,
          accountName: azurite.accountName,
          accountKey: azurite.accountKey
        }
      },
      dependencies: [],
      pollingInterval: 60
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
    firstComponentName: generated?.components?.[0]?.name,
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
  },
  {
    key: 'azurite-retrieve-components',
    title: 'Azurite-backed registry retrieving many components with full metadata',
    urlPath: '/?meta=true',
    azurite: true
  },
  {
    key: 'azurite-return-component',
    title: 'Azurite-backed registry returning a single component',
    urlPath: '/{firstComponent}/1.0.0?firstName=Jane&lastName=Doe',
    azurite: true
  },
  {
    key: 'azurite-return-components-batch',
    title: 'Azurite-backed registry returning a batch of components',
    urlPath: '/',
    method: 'POST',
    body: 'batch',
    azurite: true
  }
];

// Azurite scenarios start an Azurite blob emulator, upload a configurable
// number of components, then run bombardier against the registry.
// Options: --azurite-component-count (default 500), --azurite-port (default random),
// --azurite-in-memory-persistence (default true), --azurite-batch-size (default 50).

const benchmarkScenario = async ({ scenario, options }) => {
  const scenarioResult = {
    key: scenario.key,
    title: scenario.title,
    runs: [],
    aggregate: null,
    resourceUsage: null
  };

  const server = await startRegistry(scenario.key, options);
  const urlPath = scenario.urlPath.replace(
    /\{firstComponent\}/g,
    server.firstComponentName || 'stress-component-001'
  );
  const url = `${server.baseUrl.replace(/\/$/, '')}${urlPath}`;
  const resourceMeasurements = [];

  const requestBody =
    scenario.body === 'batch'
      ? buildBatchComponentBody(server.firstComponentName, options.azuriteBatchSize)
      : scenario.body;

  try {
    for (let attempt = 1; attempt <= options.repetitions; attempt += 1) {
      const monitoring = startResourceMonitoring();
      
      const run = await runBombardier({
        url,
        options: {
          connections: options.connections,
          duration: options.duration,
          timeout: options.timeout,
          method: scenario.method || 'GET',
          requests: options.requests,
          rate: options.rate,
          disableKeepAlives: options.disableKeepAlives,
          headers: options.headers,
          body: requestBody
        }
      });
      
      const resourceDelta = monitoring.getDelta();
      resourceMeasurements.push(resourceDelta);
      
      const metrics = mapBombardierResult(run.raw.result);
      const runResult = {
        attempt,
        command: `bombardier ${run.args.join(' ')}`,
        metrics,
        rawResult: run.raw.result,
        resourceUsage: resourceDelta
      };

      scenarioResult.runs.push(runResult);

      const rps = metrics.rpsMean.toFixed(2);
      const p95 = metrics.latencyP95Ms.toFixed(2);
      const mem = resourceDelta.memory.heapUsedDelta.toFixed(2);
      const peakMem = resourceDelta.memory.peakHeapUsed.toFixed(2);
      const ok = (metrics.successRate * 100).toFixed(2);
      console.log(
        `[${scenario.key}] run ${attempt}/${options.repetitions} | rps=${rps} | p95=${p95}ms | mem=${mem}MB | peak=${peakMem}MB | success=${ok}%`
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
    peakHeapUsed: {
      average: resourceMeasurements.reduce((sum, m) => sum + m.memory.peakHeapUsed, 0) / resourceMeasurements.length,
      min: Math.min(...resourceMeasurements.map(m => m.memory.peakHeapUsed)),
      max: Math.max(...resourceMeasurements.map(m => m.memory.peakHeapUsed))
    },
    peakRss: {
      average: resourceMeasurements.reduce((sum, m) => sum + m.memory.peakRss, 0) / resourceMeasurements.length,
      min: Math.min(...resourceMeasurements.map(m => m.memory.peakRss)),
      max: Math.max(...resourceMeasurements.map(m => m.memory.peakRss))
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
  scenarioResult.aggregate = aggregate(scenarioResult.runs);
  return scenarioResult;
};

const parseArguments = (argv) => {
  const args = {};
  for (const entry of argv) {
    if (!entry.startsWith('--')) continue;
    const [rawKey, rawValue] = entry.replace(/^--/, '').split('=');
    if (!rawKey) continue;
    args[rawKey] = rawValue ?? 'true';
  }

  return args;
};

const selectScenarios = (selected) => {
  const all = buildScenarios();
  if (!selected || selected.length === 0) {
    // By default, exclude high-load and azurite scenarios (they take longer)
    return all.filter((scenario) => !scenario.highLoad && !scenario.azurite);
  }
  const selectedSet = new Set(selected);
  return all.filter((scenario) => selectedSet.has(scenario.key));
};

const main = async () => {
  const args = parseArguments(process.argv.slice(2));
  const parsedHeaders = parseList(args.headers);
  const selectedScenarioKeys = parseList(args.scenarios);
  const scenarios = selectScenarios(selectedScenarioKeys);

  if (scenarios.length === 0) {
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
    ),
    azuriteComponentCount: parseInteger(args['azurite-component-count'], 500),
    azuriteBatchSize: parseInteger(args['azurite-batch-size'], 50),
    azuritePort: parseInteger(args['azurite-port'], 0),
    azuriteInMemoryPersistence:
      args['azurite-in-memory-persistence'] !== 'false'
  };

  const getScenarioOptions = (scenario) => {
    if (scenario.highLoad) {
      return {
        ...baseOptions,
        connections: parseInteger(args['high-load-connections'], 200), // Reduced from 500 to 200
        duration: args['high-load-duration'] || '30s', // Reduced from 60s to 30s
        repetitions: parseInteger(args['high-load-repetitions'], 2) // Reduced from 3 to 2
      };
    }
    if (scenario.azurite) {
      return {
        ...baseOptions,
        timeout: args.timeout || '30s'
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
      storageMaxConcurrentRequests: baseOptions.storageMaxConcurrentRequests,
      azuriteComponentCount: baseOptions.azuriteComponentCount,
      azuriteBatchSize: baseOptions.azuriteBatchSize,
      azuritePort: baseOptions.azuritePort,
      azuriteInMemoryPersistence: baseOptions.azuriteInMemoryPersistence
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

  console.log(`\nSaved benchmark baseline:\n- ${outputPath}\n- ${latestPath}`);

  // Load previous baseline for comparison
  const previousBaselinePath = path.join(baseOptions.outDir, 'server-benchmark-baseline.json');
  let previousBaseline = null;
  try {
    previousBaseline = await readJson(previousBaselinePath);
  } catch (error) {
    // No previous baseline exists
  }

  // Compare with previous baseline
  const comparison = compareWithBaseline(baseline, previousBaseline);
  printComparison(comparison);

  // Print summary with resource usage
  for (const scenario of baseline.scenarios) {
    const aggregateResult = scenario.aggregate;
    const rps = aggregateResult.rps;
    const p95 = aggregateResult.latencyP95Ms;
    const success = aggregateResult.successRate;
    const resourceUsage = scenario.resourceUsage;
    
    console.log(
      `\n[${scenario.key}] samples=${aggregateResult.samples} | rps(avg/min/max)=${rps.average.toFixed(2)}/${rps.min.toFixed(2)}/${rps.max.toFixed(2)} | p95ms(avg/min/max)=${p95.average.toFixed(2)}/${p95.min.toFixed(2)}/${p95.max.toFixed(2)} | success(avg)=${(success.average * 100).toFixed(2)}%`
    );
    
    if (resourceUsage) {
      console.log(
        `  Memory delta: heapUsed(avg/min/max)=${resourceUsage.heapUsedDelta.average.toFixed(2)}/${resourceUsage.heapUsedDelta.min.toFixed(2)}/${resourceUsage.heapUsedDelta.max.toFixed(2)}MB | rss(avg/min/max)=${resourceUsage.rssDelta.average.toFixed(2)}/${resourceUsage.rssDelta.min.toFixed(2)}/${resourceUsage.rssDelta.max.toFixed(2)}MB`
      );
      console.log(
        `  Memory peak: heapUsed(avg/min/max)=${resourceUsage.peakHeapUsed.average.toFixed(2)}/${resourceUsage.peakHeapUsed.min.toFixed(2)}/${resourceUsage.peakHeapUsed.max.toFixed(2)}MB | rss(avg/min/max)=${resourceUsage.peakRss.average.toFixed(2)}/${resourceUsage.peakRss.min.toFixed(2)}/${resourceUsage.peakRss.max.toFixed(2)}MB`
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
