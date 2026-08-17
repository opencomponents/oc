# Plan 003: Make repository work counts a performance regression gate

> **Executor instructions**: Implement this plan as one benchmark-only PR. Follow each step in order, run every verification command, and stop on any condition in "STOP conditions". When complete, update this plan's status in `plans/README.md` unless a reviewer owns the index.
>
> **Drift check (run first)**: `git diff --stat 0564f540..HEAD -- packages/oc/tasks/benchmarks/storage-adapter.js packages/oc/tasks/benchmarks/server-benchmark.js packages/oc/tasks/benchmarks/single-flight-burst.js packages/oc/tasks/benchmarks/benchmark-assertions.js packages/oc/test/unit/tasks-benchmark-assertions.js packages/oc/package.json plans/README.md`
> If an in-scope file changed, compare it with the excerpts below. Stop if the benchmark architecture or scenario names no longer match.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `0564f540`, 2026-08-17

## Why this matters

The existing cold-burst benchmark proves single-flight for environment, provider, and template assets, but it replaces `repository.getComponent` with an immediate stub. Production renders still retrieve component manifests before that single-flight boundary, so duplicate manifest reads are invisible. This PR creates the equal-work and work-count gate required before changing cache behavior in later PRs.

## Current state

- `packages/oc/tasks/benchmarks/single-flight-burst.js` builds an injected repository and counts only three downstream methods:

```js
// single-flight-burst.js:119-151
const calls = {
  getDataProvider: 0,
  getCompiledView: 0,
  getEnv: 0
};
...
const repository = {
  getComponent: async () => component,
  getEnv: async () => downstreamRead('getEnv', ...),
  getDataProvider: async () => downstreamRead('getDataProvider', ...),
  getCompiledView: async () => downstreamRead('getCompiledView', ...)
};
```

- `packages/oc/tasks/benchmarks/storage-adapter.js:24-60` tracks active and peak reads, but not total calls or paths.
- `packages/oc/tasks/benchmarks/server-benchmark.js:613-643` records the adapter metrics after each run.
- `packages/oc/package.json` exposes `bench`, `bench:quick`, and `bench:high-load`, but not the cold-burst harness.
- Benchmarks run against built `dist`; build before executing them.

Repository conventions:

- Benchmark scripts are CommonJS and self-contained.
- Deterministic work-count assertions should throw and exit nonzero; timing values should be reported, not used as strict cross-machine pass/fail thresholds.
- Generated benchmark JSON belongs under the already ignored `packages/oc/test/results/benchmarks` directory.

## Commands you will need

Run from the repository root.

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm --workspace packages/oc run build` | exit 0 |
| Unit tests | `npm --workspace packages/oc run test-silent` | exit 0 |
| Assertion tests | `npx mocha --timeout 20000 packages/oc/test/unit/tasks-benchmark-assertions.js` | exit 0; positive and negative gate fixtures pass |
| Burst benchmark | `npm --workspace packages/oc run bench:burst` | exit 0; JSON for N=50 and N=200 |
| Storage scenario | `npm --workspace packages/oc run bench -- --scenarios=storage-simulated --repetitions=2 --result-file=/tmp/oc-storage-bench.json` | exit 0; success 100%, work counts present, exact result file written |
| Batch scenario | `npm --workspace packages/oc run bench -- --scenarios=batch-storage --repetitions=2 --result-file=/tmp/oc-batch-bench.json` | exit 0; success 100%, work counts present, exact result file written |
| Comparison self-check | `npm --workspace packages/oc run bench -- --scenarios=storage-simulated --repetitions=2 --baseline-file=/tmp/oc-storage-bench.json --max-rps-regression-percent=100 --max-p95-regression-percent=100` | exit 0 when environment/options match; focused synthetic tests cover threshold failure |

## Scope

**In scope**:

- `packages/oc/tasks/benchmarks/storage-adapter.js`
- `packages/oc/tasks/benchmarks/server-benchmark.js`
- `packages/oc/tasks/benchmarks/single-flight-burst.js`
- New `packages/oc/tasks/benchmarks/benchmark-assertions.js`
- New `packages/oc/test/unit/tasks-benchmark-assertions.js`
- `packages/oc/package.json`
- `plans/README.md` status update

**Out of scope**:

- Any file under `packages/oc/src/**`.
- Cache implementation changes.
- Updating the committed performance baseline from a different machine.
- Strict timing, RSS, or heap thresholds that can fail solely because the machine changed.

## Git workflow

- Branch: `advisor/003-manifest-work-parity`
- Suggested commit: `test(perf): count repository work in registry benchmarks`
- Do not push or open a PR unless explicitly instructed.
- Preserve the untracked `packages/oc/js-library-optimization-playbook.md` file unchanged.

## Steps

### Step 1: Count storage work by operation and path

Extend `createStorageAdapter` in `storage-adapter.js` with deterministic counters:

- Count `getFile`, `getJson`, and `listSubDirectories` calls separately.
- Count reads by normalized relative path so `.../package.json`, `server.js`, `template.js`, and `.env` are distinguishable.
- Keep `activeReads` and `peakConcurrentReads` behavior.
- `resetMetrics()` must reset completed-call counters and peak concurrency without corrupting an already active operation.
- `getMetrics()` must return plain JSON-serializable data.

Do not count `getJson` twice merely because it internally reads text. Count public adapter operations, and optionally expose a separate physical-read total if useful; name both unambiguously.

**Verify**: `npm --workspace packages/oc run build` → exit 0.

### Step 2: Exercise a real repository in the burst worker

Replace the immediate `getComponent` stub in `single-flight-burst.js` with the real built repository implementation backed by an in-memory, delayed, instrumented storage adapter.

The adapter fixture must provide:

- a valid `components.json` containing the benchmark component/version;
- the component version `package.json` object;
- `.env`, `server.js`, and `template.js` content already present in the script;
- the remaining `StorageAdapter` methods needed by `repository.init()` and rendering.

Initialize the repository before taking the burst memory/time baseline. Reset operation counters after initialization so the burst report separates startup hydration from render work. Keep one fresh child process per N value.

The output for each N must include:

- manifest/package JSON calls;
- env/provider/template calls;
- calls grouped by path;
- peak concurrent storage operations;
- completed renders, wall time, CPU, and memory as today.

On the tree at commit `0564f540`, pin these deterministic expectations:

- every render completes with the expected HTML;
- env/provider/template work is single-flighted to one call each;
- manifest work is greater than one under the concurrent burst, documenting the pre-optimization baseline.

Do not pin an exact wall-time threshold.

**Verify**: `node packages/oc/tasks/benchmarks/single-flight-burst.js` from the repository root → exit 0; both burst sizes report manifest work and deterministic assertions pass.

### Step 3: Register the burst command

Add `"bench:burst": "node tasks/benchmarks/single-flight-burst.js"` to `packages/oc/package.json`. Do not rename existing benchmark scripts.

**Verify**: `npm --workspace packages/oc run bench:burst` → exit 0.

### Step 4: Persist work counts in server benchmark results

Ensure `server-benchmark.js` stores the expanded adapter metrics on each run and aggregates at least:

- total public reads by operation;
- total package-manifest reads;
- total provider/template/env reads;
- peak concurrency.

Normalize counts per successful request in the aggregate output so before/after runs with slightly different request totals remain comparable. Preserve the raw totals too.

Add these explicit CLI options:

- `--result-file=<absolute-or-resolved-path>`: write the complete result to that exact file in addition to normal output;
- `--baseline-file=<path>`: compare against that result instead of the committed stale baseline;
- `--verify-result-file=<path>`: skip registry/load generation, load an existing result as the current run, apply all requested compatibility/work/success/threshold assertions, and exit 0/1; this exists so assertion behavior is testable without running Bombardier;
- `--max-rps-regression-percent=<number>` and `--max-p95-regression-percent=<number>`: when provided with a baseline, exit nonzero if any selected scenario exceeds either regression threshold;
- `--expect-package-reads=<comma-separated-integers>`: assert the package-manifest read count for each repetition in order and exit nonzero on mismatch;
- `--expect-success-rate=<number>`: assert every repetition's success rate exactly.

Before comparing, require equal Node major, platform/architecture, selected scenarios, repetitions, connections, duration, request method/body, storage latency, and storage concurrency options. Exit nonzero with a clear mismatch list rather than comparing different environments/workloads. Define percentage direction explicitly: RPS regression is `(baseline-current)/baseline*100`; p95 regression is `(current-baseline)/baseline*100`.

Put workload compatibility, percentage calculation, success-rate checks, per-run package-read checks, and threshold enforcement in pure functions exported from new `benchmark-assertions.js`; `server-benchmark.js` must call the same functions and let thrown assertion errors reach its existing top-level catch/nonzero exit path.

In `tasks-benchmark-assertions.js`, use synthetic current/baseline objects to cover:

- a compatible passing comparison;
- Node/platform/options/scenario mismatch throws;
- RPS regression over threshold throws;
- p95 regression over threshold throws;
- package-read sequence mismatch throws;
- success-rate mismatch throws;
- exact threshold boundary passes;
- zero baseline values are handled without division-by-zero acceptance;
- spawn `server-benchmark.js --verify-result-file=<synthetic-current> ...` for one passing fixture and each mismatch class, asserting process status 0 for the pass and nonzero for every failure.

Timing thresholds are valid only with an explicit same-machine baseline file. Deterministic work assertions may run without one.

**Verify**: run the Assertion tests, storage, batch, and comparison self-check commands from the command table → exit 0; synthetic negative fixtures throw as expected and the integrated CLI exits nonzero when an assertion helper throws.

### Step 5: Run the full package checks

**Verify**: `npm --workspace packages/oc run build` → exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` → exit 0.

## Test plan

- Verify metric reset does not produce negative active counts.
- Verify `getJson` and `getFile` are distinguishable in output.
- Verify path counts identify package manifests separately from render artifacts.
- Verify N=50 and N=200 run in separate processes.
- Verify malformed or failed renders still cause the burst command to exit nonzero.
- Verify benchmark results remain JSON serializable.
- Verify explicit result paths, environment/workload mismatch rejection, percentage direction, exact per-run package-read assertions, exact success assertions, and nonzero exit on threshold regression.

## Done criteria

- [ ] `bench:burst` is a package script and exits 0.
- [ ] The burst uses the real repository, not an immediate `getComponent` stub.
- [ ] Startup counters are separated from burst counters.
- [ ] Manifest, env, provider, and template work counts are visible by path.
- [ ] Existing single-flight work remains exactly one call per render artifact.
- [ ] Server storage and batch results include raw and per-request work counts.
- [ ] Explicit result/baseline/verify-result files, workload compatibility checks, deterministic work assertions, and regression thresholds are executable CLI gates with spawned-process positive/negative tests.
- [ ] Build and tests pass.
- [ ] No `packages/oc/src/**` file changed.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- A real repository cannot be initialized without changing production source.
- The current env/provider/template single-flight assertions no longer produce one call on a fresh process.
- Work counts include benchmark setup/preflight and cannot be reliably reset before timing.
- Success is below 100% for either server scenario.
- A proposed metric cannot be serialized into result JSON.

## Maintenance notes

- Plan 005 will change the manifest assertion from repeated reads to one coalesced/cached read.
- Keep deterministic work-count assertions separate from noisy timing thresholds.
- When a new cache layer is added, add its hit/miss/work evidence here rather than inventing a benchmark that repeatedly hits one key and reports that as algorithm throughput.
