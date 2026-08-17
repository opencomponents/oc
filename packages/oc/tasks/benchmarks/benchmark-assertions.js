const formatValue = (value) => JSON.stringify(value) ?? String(value);

const getNodeMajor = (version) => {
  const match = /^v?(\d+)(?:\.|$)/.exec(String(version || ''));
  if (!match) throw new Error(`Invalid Node version: ${formatValue(version)}`);
  return Number(match[1]);
};

const getScenarioMap = (result, label) => {
  if (!Array.isArray(result?.scenarios) || result.scenarios.length === 0) {
    throw new Error(`${label} result has no scenarios`);
  }
  const scenarios = new Map();
  for (const scenario of result.scenarios) {
    if (!scenario?.key || scenarios.has(scenario.key)) {
      throw new Error(`${label} result has an invalid or duplicate scenario key`);
    }
    scenarios.set(scenario.key, scenario);
  }
  return scenarios;
};

const getCompatibilityMismatches = (current, baseline) => {
  const mismatches = [];
  const compare = (label, currentValue, baselineValue) => {
    if (formatValue(currentValue) !== formatValue(baselineValue)) {
      mismatches.push(
        `${label}: current=${formatValue(currentValue)} baseline=${formatValue(
          baselineValue
        )}`
      );
    }
  };

  let currentNodeMajor;
  let baselineNodeMajor;
  try {
    currentNodeMajor = getNodeMajor(current?.node);
  } catch (error) {
    mismatches.push(`current ${error.message}`);
  }
  try {
    baselineNodeMajor = getNodeMajor(baseline?.node);
  } catch (error) {
    mismatches.push(`baseline ${error.message}`);
  }
  if (currentNodeMajor !== undefined && baselineNodeMajor !== undefined) {
    compare('node major', currentNodeMajor, baselineNodeMajor);
  }
  compare('platform/architecture', current?.platform, baseline?.platform);
  compare('host', current?.host, baseline?.host);

  let currentScenarios;
  let baselineScenarios;
  try {
    currentScenarios = getScenarioMap(current, 'current');
  } catch (error) {
    mismatches.push(error.message);
  }
  try {
    baselineScenarios = getScenarioMap(baseline, 'baseline');
  } catch (error) {
    mismatches.push(error.message);
  }
  if (!currentScenarios || !baselineScenarios) return mismatches;

  const currentKeys = [...currentScenarios.keys()].sort();
  const baselineKeys = [...baselineScenarios.keys()].sort();
  compare('selected scenarios', currentKeys, baselineKeys);
  const workloadFields = [
    ['repetitions', (workload) => workload?.repetitions],
    ['connections', (workload) => workload?.connections],
    ['duration', (workload) => workload?.duration],
    ['timeout', (workload) => workload?.timeout],
    ['requests', (workload) => workload?.requests],
    ['rate', (workload) => workload?.rate],
    ['disable keep-alives', (workload) => workload?.disableKeepAlives],
    ['headers', (workload) => workload?.headers],
    ['request method', (workload) => workload?.request?.method],
    ['request body', (workload) => workload?.request?.body],
    ['storage minimum latency', (workload) => workload?.storage?.minLatencyMs],
    ['storage maximum latency', (workload) => workload?.storage?.maxLatencyMs],
    [
      'storage maximum concurrency',
      (workload) => workload?.storage?.maxConcurrentRequests
    ]
  ];

  for (const key of currentKeys.filter((entry) => baselineScenarios.has(entry))) {
    const currentScenario = currentScenarios.get(key);
    const baselineScenario = baselineScenarios.get(key);
    compare(
      `${key} run count`,
      currentScenario.runs?.length,
      baselineScenario.runs?.length
    );
    for (const [label, select] of workloadFields) {
      compare(
        `${key} ${label}`,
        select(currentScenario.workload),
        select(baselineScenario.workload)
      );
    }
  }

  return mismatches;
};

const assertCompatibleWorkloads = (current, baseline) => {
  const mismatches = getCompatibilityMismatches(current, baseline);
  if (mismatches.length) {
    throw new Error(
      `Benchmark workload is incompatible:\n${mismatches
        .map((mismatch) => `- ${mismatch}`)
        .join('\n')}`
    );
  }
};

const calculateRegressionPercent = (current, baseline, direction) => {
  if (!Number.isFinite(current) || current < 0) {
    throw new Error(`Current metric must be a finite nonnegative number: ${current}`);
  }
  if (!Number.isFinite(baseline) || baseline <= 0) {
    throw new Error(`Baseline metric must be a finite positive number: ${baseline}`);
  }
  if (direction === 'higher-is-better') {
    return ((baseline - current) / baseline) * 100;
  }
  if (direction === 'lower-is-better') {
    return ((current - baseline) / baseline) * 100;
  }
  throw new Error(`Unknown regression direction: ${direction}`);
};

const selectScenarios = (result, scenarioKeys) => {
  const scenarios = getScenarioMap(result, 'benchmark');
  if (!scenarioKeys?.length) return [...scenarios.values()];
  return scenarioKeys.map((key) => {
    if (!scenarios.has(key)) {
      throw new Error(`Benchmark result does not contain scenario: ${key}`);
    }
    return scenarios.get(key);
  });
};

const assertSuccessRates = (result, expected, scenarioKeys) => {
  if (!Number.isFinite(expected) || expected < 0 || expected > 1) {
    throw new Error(`Expected success rate must be between 0 and 1: ${expected}`);
  }
  for (const scenario of selectScenarios(result, scenarioKeys)) {
    if (!Array.isArray(scenario.runs) || scenario.runs.length === 0) {
      throw new Error(`Scenario ${scenario.key} has no benchmark runs`);
    }
    for (const run of scenario.runs) {
      if (run.metrics?.successRate !== expected) {
        throw new Error(
          `Scenario ${scenario.key} run ${run.attempt} success rate mismatch: expected ${expected}, got ${run.metrics?.successRate}`
        );
      }
    }
  }
};

const assertPackageReadSequence = (result, expectedCounts, scenarioKeys) => {
  if (
    !Array.isArray(expectedCounts) ||
    expectedCounts.length === 0 ||
    expectedCounts.some(
      (count) => !Number.isSafeInteger(count) || count < 0
    )
  ) {
    throw new Error('Expected package reads must be nonnegative integers');
  }
  for (const scenario of selectScenarios(result, scenarioKeys)) {
    if (scenario.runs?.length !== expectedCounts.length) {
      throw new Error(
        `Scenario ${scenario.key} package read sequence length mismatch: expected ${expectedCounts.length}, got ${scenario.runs?.length}`
      );
    }
    scenario.runs.forEach((run, index) => {
      const actual = run.storageWork?.raw?.packageManifestReads;
      if (actual !== expectedCounts[index]) {
        throw new Error(
          `Scenario ${scenario.key} run ${run.attempt} package reads mismatch: expected ${expectedCounts[index]}, got ${actual}`
        );
      }
    });
  }
};

const assertRegressionThresholds = (
  current,
  baseline,
  {
    maxRpsRegressionPercent,
    maxP95RegressionPercent,
    scenarioKeys
  } = {}
) => {
  for (const [label, threshold] of [
    ['RPS', maxRpsRegressionPercent],
    ['p95', maxP95RegressionPercent]
  ]) {
    if (threshold !== undefined && (!Number.isFinite(threshold) || threshold < 0)) {
      throw new Error(`${label} regression threshold must be nonnegative`);
    }
  }
  assertCompatibleWorkloads(current, baseline);
  const baselineScenarios = getScenarioMap(baseline, 'baseline');
  for (const scenario of selectScenarios(current, scenarioKeys)) {
    const baselineScenario = baselineScenarios.get(scenario.key);
    if (maxRpsRegressionPercent !== undefined) {
      const currentValue = scenario.aggregate?.rps?.average;
      const baselineValue = baselineScenario.aggregate?.rps?.average;
      const regression = calculateRegressionPercent(
        currentValue,
        baselineValue,
        'higher-is-better'
      );
      if (regression > maxRpsRegressionPercent) {
        throw new Error(
          `Scenario ${scenario.key} RPS regression ${regression.toFixed(
            2
          )}% exceeds ${maxRpsRegressionPercent}% (current ${currentValue}, baseline ${baselineValue})`
        );
      }
    }
    if (maxP95RegressionPercent !== undefined) {
      const currentValue = scenario.aggregate?.latencyP95Ms?.average;
      const baselineValue = baselineScenario.aggregate?.latencyP95Ms?.average;
      const regression = calculateRegressionPercent(
        currentValue,
        baselineValue,
        'lower-is-better'
      );
      if (regression > maxP95RegressionPercent) {
        throw new Error(
          `Scenario ${scenario.key} p95 regression ${regression.toFixed(
            2
          )}% exceeds ${maxP95RegressionPercent}% (current ${currentValue}, baseline ${baselineValue})`
        );
      }
    }
  }
};

const applyBenchmarkAssertions = ({
  current,
  baseline,
  scenarioKeys,
  expectedPackageReads,
  expectedSuccessRate,
  maxRpsRegressionPercent,
  maxP95RegressionPercent
}) => {
  if (expectedPackageReads !== undefined) {
    assertPackageReadSequence(current, expectedPackageReads, scenarioKeys);
  }
  if (expectedSuccessRate !== undefined) {
    assertSuccessRates(current, expectedSuccessRate, scenarioKeys);
  }
  const hasThreshold =
    maxRpsRegressionPercent !== undefined ||
    maxP95RegressionPercent !== undefined;
  if (hasThreshold && !baseline) {
    throw new Error('Regression thresholds require an explicit baseline file');
  }
  if (baseline) {
    assertRegressionThresholds(current, baseline, {
      maxRpsRegressionPercent,
      maxP95RegressionPercent,
      scenarioKeys
    });
  }
};

module.exports = {
  applyBenchmarkAssertions,
  assertCompatibleWorkloads,
  assertPackageReadSequence,
  assertRegressionThresholds,
  assertSuccessRates,
  calculateRegressionPercent,
  getCompatibilityMismatches,
  getNodeMajor
};
