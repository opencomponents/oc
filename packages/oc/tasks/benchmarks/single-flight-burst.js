const { spawnSync } = require('node:child_process');
const createStorageAdapter = require('./storage-adapter');

const WORKER_ENV = 'OC_SINGLE_FLIGHT_BURST_WORKER_N';
const BURST_SIZES = [50, 200];
const DOWNSTREAM_LATENCY_MS = 30;
const MEMORY_SAMPLE_INTERVAL_MS = 1;
const ENV_VALUE = 'single-flight-env-covered';
const BYTES_PER_MB = 1024 * 1024;

const writeAndExit = (value, exitCode) => {
  process.stdout.write(`${JSON.stringify(value)}\n`, () => {
    process.exit(exitCode);
  });
};

const toMb = (bytes) => Number((Number(bytes || 0) / BYTES_PER_MB).toFixed(3));

const memorySnapshot = () => {
  const memory = process.memoryUsage();
  return {
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed
  };
};

const runParent = () => {
  const results = BURST_SIZES.map((n) => {
    const child = spawnSync(process.execPath, [__filename], {
      encoding: 'utf8',
      env: {
        ...process.env,
        [WORKER_ENV]: String(n)
      },
      maxBuffer: 1024 * 1024
    });

    if (child.error) throw child.error;
    if (child.status !== 0) {
      throw new Error(
        [
          `single-flight burst worker for N=${n} failed`,
          `exit status: ${child.status}`,
          child.stderr.trim(),
          child.stdout.trim()
        ]
          .filter(Boolean)
          .join('\n')
      );
    }

    const output = child.stdout.trim();
    if (!output) {
      throw new Error(`single-flight burst worker for N=${n} returned no output`);
    }
    return JSON.parse(output);
  });

  writeAndExit(
    {
      benchmark: 'single-flight-cold-burst',
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
      fixedDownstreamLatencyMs: DOWNSTREAM_LATENCY_MS,
      freshProcessPerBurst: true,
      results
    },
    0
  );
};

const runWorker = async (n) => {
  if (!BURST_SIZES.includes(n)) {
    throw new Error(
      `invalid ${WORKER_ENV}: expected ${BURST_SIZES.join(' or ')}, got ${n}`
    );
  }

  const GetComponentHelper = require(
    '../../dist/registry/routes/helpers/get-component.js'
  ).default;
  const Repository = require(
    '../../dist/registry/domain/repository.js'
  ).default;
  const componentName = 'single-flight-burst-component';
  const componentVersion = '1.0.0';
  const templateHash = 'single-flight-burst-template';
  const dataProviderSource = [
    '"use strict";',
    'module.exports.data = function data(context, callback) {',
    '  callback(null, { envValue: context.env.BURST_ENV });',
    '};'
  ].join('\n');
  const compiledViewSource = [
    'var oc = oc || {};',
    'oc.components = oc.components || {};',
    `oc.components[${JSON.stringify(templateHash)}] = function (data) {`,
    '  return "<div>" + data.envValue + "</div>";',
    '};'
  ].join('\n');
  const component = {
    name: componentName,
    version: componentVersion,
    oc: {
      container: false,
      date: 0,
      files: {
        template: {
          type: 'jade',
          hashKey: templateHash,
          src: 'template.js',
          version: '7.0.6',
          size: Buffer.byteLength(compiledViewSource)
        },
        dataProvider: {
          type: 'node.js',
          hashKey: 'single-flight-burst-provider',
          src: 'server.js',
          size: Buffer.byteLength(dataProviderSource)
        },
        static: [],
        env: '.env'
      },
      packaged: true,
      parameters: {},
      plugins: [],
      renderInfo: false,
      version: '0.50.61'
    }
  };
  const componentRoot = `components/${componentName}/${componentVersion}`;
  const storageAdapter = createStorageAdapter({
    minLatencyMs: DOWNSTREAM_LATENCY_MS,
    maxLatencyMs: DOWNSTREAM_LATENCY_MS,
    maxConcurrentRequests: 256,
    files: new Map([
      [
        'components/components.json',
        JSON.stringify({
          lastEdit: 1,
          components: { [componentName]: [componentVersion] }
        })
      ],
      [
        'components/components-details.json',
        JSON.stringify({
          lastEdit: 1,
          components: {
            [componentName]: {
              [componentVersion]: {
                publishDate: 0,
                templateSize: Buffer.byteLength(compiledViewSource)
              }
            }
          }
        })
      ],
      [`${componentRoot}/package.json`, JSON.stringify(component)],
      [`${componentRoot}/.env`, `BURST_ENV=${ENV_VALUE}\n`],
      [`${componentRoot}/server.js`, dataProviderSource],
      [`${componentRoot}/template.js`, compiledViewSource]
    ]),
    directories: new Map([
      ['components', [componentName]],
      [`components/${componentName}`, [componentVersion]]
    ])
  });
  const conf = {
    baseUrl: 'http://benchmark.invalid/',
    customHeadersToSkipOnWeakVersion: [],
    dataProvider: { enabled: true },
    dependencies: [],
    env: {},
    fallbackRegistryUrl: '',
    hotReloading: false,
    local: false,
    plugins: {},
    pollingInterval: 3600,
    refreshInterval: 0,
    storage: {
      adapter: () => storageAdapter,
      options: {
        componentsDir: 'components',
        path: '//benchmark.invalid/'
      }
    },
    templates: [],
    verbosity: 0
  };
  const repository = Repository(conf);
  await repository.init();
  await storageAdapter.waitForIdle();
  const startupStorageMetrics = storageAdapter.getMetrics();
  if (startupStorageMetrics.activeReads !== 0) {
    throw new Error(
      `startup storage reads did not settle: ${startupStorageMetrics.activeReads}`
    );
  }
  storageAdapter.resetMetrics();
  const getComponent = GetComponentHelper(conf, repository);
  const renderOne = () =>
    new Promise((resolve, reject) => {
      getComponent(
        {
          conf,
          headers: {},
          ip: '127.0.0.1',
          name: componentName,
          parameters: {},
          version: componentVersion
        },
        (result) => {
          if (result.status !== 200) {
            reject(
              new Error(
                `render failed with status ${result.status}: ${
                  result.response.code || 'unknown error'
                }`
              )
            );
            return;
          }
          resolve(result);
        }
      );
    });
  try {
    const baselineMemory = memorySnapshot();
    const peakMemory = { ...baselineMemory };
    const baselineResourceUsage = process.resourceUsage();
    const sampleMemory = () => {
      const current = memorySnapshot();
      peakMemory.rssBytes = Math.max(peakMemory.rssBytes, current.rssBytes);
      peakMemory.heapUsedBytes = Math.max(
        peakMemory.heapUsedBytes,
        current.heapUsedBytes
      );
    };
    const sampler = setInterval(sampleMemory, MEMORY_SAMPLE_INTERVAL_MS);
    sampler.unref();
    const startedAt = process.hrtime.bigint();
    let results;
    try {
      results = await Promise.all(Array.from({ length: n }, () => renderOne()));
    } finally {
      sampleMemory();
      clearInterval(sampler);
    }
    const endedAt = process.hrtime.bigint();
    const finalResourceUsage = process.resourceUsage();
    const expectedHtml = `<div>${ENV_VALUE}</div>`;
    if (!results.every((result) => result.response.html === expectedHtml)) {
      throw new Error(
        `env coverage failed: expected every render to return ${expectedHtml}`
      );
    }

    const storageMetrics = storageAdapter.getMetrics();
    const callsFor = (filePath, operation) =>
      storageMetrics.completedOperations.byPath[filePath]?.byOperation[
        operation
      ] || 0;
    const manifestReads = callsFor(`${componentRoot}/package.json`, 'getJson');
    const envReads = callsFor(`${componentRoot}/.env`, 'getFile');
    const providerReads = callsFor(`${componentRoot}/server.js`, 'getFile');
    const templateReads = callsFor(`${componentRoot}/template.js`, 'getFile');
    if (manifestReads <= 1) {
      throw new Error(
        `manifest work baseline changed: expected more than one read, got ${manifestReads}`
      );
    }
    for (const [artifact, reads] of Object.entries({
      env: envReads,
      provider: providerReads,
      template: templateReads
    })) {
      if (reads !== 1) {
        throw new Error(
          `${artifact} single-flight baseline changed: expected 1 read, got ${reads}`
        );
      }
    }
    if (storageMetrics.activeReads !== 0) {
      throw new Error(
        `storage reads did not return to zero: ${storageMetrics.activeReads}`
      );
    }

    const report = {
      n,
      pid: process.pid,
      hotReloading: conf.hotReloading,
      completedRenders: results.length,
      storageWork: {
        manifestReads,
        envReads,
        providerReads,
        templateReads
      },
      storageMetrics,
      startupStorageMetrics,
      wallTimeMs: Number(endedAt - startedAt) / 1e6,
      memory: {
        baseline: {
          rssMb: toMb(baselineMemory.rssBytes),
          heapUsedMb: toMb(baselineMemory.heapUsedBytes)
        },
        peak: {
          rssMb: toMb(peakMemory.rssBytes),
          heapUsedMb: toMb(peakMemory.heapUsedBytes)
        },
        peakDelta: {
          rssMb: toMb(peakMemory.rssBytes - baselineMemory.rssBytes),
          heapUsedMb: toMb(
            peakMemory.heapUsedBytes - baselineMemory.heapUsedBytes
          )
        }
      },
      cpu: {
        userTimeMs:
          (finalResourceUsage.userCPUTime - baselineResourceUsage.userCPUTime) /
          1000,
        systemTimeMs:
          (finalResourceUsage.systemCPUTime -
            baselineResourceUsage.systemCPUTime) /
          1000
      }
    };
    JSON.stringify(report);
    return report;
  } finally {
    await repository.close();
  }
};

const workerN = process.env[WORKER_ENV];
if (workerN === undefined) {
  try {
    runParent();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
} else {
  runWorker(Number.parseInt(workerN, 10))
    .then((result) => writeAndExit(result, 0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
