const { spawnSync } = require('node:child_process');

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
  const jadeTemplate = require('oc-template-jade');
  const componentName = 'single-flight-burst-component';
  const componentVersion = '1.0.0';
  const templateHash = 'single-flight-burst-template';
  const component = {
    name: componentName,
    version: componentVersion,
    oc: {
      container: false,
      renderInfo: false,
      files: {
        template: {
          type: 'jade',
          hashKey: templateHash,
          src: 'template.js'
        },
        dataProvider: {
          type: 'node.js',
          hashKey: 'single-flight-burst-provider',
          src: 'server.js'
        },
        env: '.env'
      }
    }
  };
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
  const calls = {
    getDataProvider: 0,
    getCompiledView: 0,
    getEnv: 0
  };
  let downstreamInFlight = 0;
  let peakConcurrentDownstreamReads = 0;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const downstreamRead = async (method, createResult) => {
    calls[method]++;
    downstreamInFlight++;
    peakConcurrentDownstreamReads = Math.max(
      peakConcurrentDownstreamReads,
      downstreamInFlight
    );
    try {
      await wait(DOWNSTREAM_LATENCY_MS);
      return createResult();
    } finally {
      downstreamInFlight--;
    }
  };
  const repository = {
    getComponent: async () => component,
    getEnv: async () =>
      downstreamRead('getEnv', () => ({ BURST_ENV: ENV_VALUE })),
    getDataProvider: async () =>
      downstreamRead('getDataProvider', () => ({
        content: dataProviderSource,
        filePath: `/${componentName}/${componentVersion}/server.js`
      })),
    getCompiledView: async () =>
      downstreamRead('getCompiledView', () => compiledViewSource),
    getTemplate: (type) =>
      type === 'jade' || type === 'oc-template-jade' ? jadeTemplate : undefined,
    getTemplatesInfo: () => [
      { type: 'oc-template-jade', version: '7.0.6', externals: [] }
    ],
    getStaticFilePath: (_name, _version, filePath) =>
      `//benchmark.invalid/${componentName}/${componentVersion}/${filePath}`
  };
  const conf = {
    baseUrl: 'http://benchmark.invalid/',
    dependencies: [],
    env: {},
    hotReloading: false,
    local: false,
    plugins: {},
    refreshInterval: 0,
    templates: []
  };
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
    throw new Error(`env coverage failed: expected every render to return ${expectedHtml}`);
  }
  if (downstreamInFlight !== 0) {
    throw new Error(
      `downstream in-flight counter did not return to zero: ${downstreamInFlight}`
    );
  }

  return {
    n,
    pid: process.pid,
    hotReloading: conf.hotReloading,
    completedRenders: results.length,
    downstreamCalls: calls,
    peakConcurrentDownstreamReads,
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
