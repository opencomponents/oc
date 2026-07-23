# Plan 002: Prove (or disprove) Plan 001's burst and batch wins with targeted benchmark scenarios

> **Executor instructions**: Follow this plan step by step. This is a measurement/benchmark task, not a product-code change. Do NOT modify any file under `packages/oc/src` or `packages/oc-fastify-server-adapter/src` except as an explicit A/B toggle via `git stash` (Step 5). Run every verification command and record its output. If a STOP condition occurs, stop and report; do not improvise.
>
> **Goal**: Plan 001's `bench:quick` A/B was neutral because the only built-in scenarios are warm-cache single-component GETs. They do not exercise the two changes with the biggest theoretical upside:
> - **Single-flight dedupe** (`get-component.ts`) — collapses concurrent cold-cache misses for the same component into one downstream load.
> - **Bounded fan-out** (`components.ts` batch route, `nested-renderer.ts`) — caps concurrency at 10 for batch/nested renders.
>
> This plan adds two scenarios that create those conditions, and measures old-vs-new on the same machine.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (benchmark tooling only; no shipped behavior change)
- **Depends on**: Plan 001 (its changes are the subject under test; leave them in the working tree)
- **Category**: perf-measurement
- **Planned at**: 2026-07-23

## Why This Matters

Plan 001 is currently justified on tail-risk/hygiene grounds, not measured throughput. Before merging, we want empirical answers to two questions:

1. **Single-flight**: under a concurrent cold-cache burst for one component, does the new code do **1** downstream `getDataProvider`/`getCompiledView`/`getEnv` load instead of **N**, and does that lower wall-time, peak concurrency, and peak memory?
2. **Bounded fan-out**: for large batch POSTs, does capping concurrency at 10 (a) protect tail latency / heap under load, and (b) **not regress** throughput for legitimate large batches?

If neither scenario shows a difference even under adversarial load, that is a valid result: recommend dropping single-flight (the most complex piece) and keeping the rest of Plan 001 on hygiene grounds.

## Critical facts about the harness (read before writing code)

These were verified in the codebase. Getting them wrong will produce false "no difference" results.

1. **Load generator is `bombardier`** (Go binary), invoked via `spawn('bombardier', ...)` in `packages/oc/tasks/benchmarks/server-benchmark.js:239` (`runBombardier`). It is installed (`bombardier 2.0.2`). It is NOT autocannon.
2. **`runBombardier` currently hardcodes GET and sends no body** (`server-benchmark.js:511` sets `method: 'GET'`; there is no `-b`/body plumbing). The batch scenario requires extending it to send `POST` + a JSON body + `Content-Type: application/json`.
3. **The registry runs in-process** with the benchmark (`server-benchmark.js:434` `oc.Registry(...)`, not a spawned server). Therefore `process.resourceUsage()` / `process.memoryUsage()` deltas in `startResourceMonitoring` **do** capture registry heap/RSS/CPU. Memory-spike differences from unbounded fan-out are observable here.
4. **`nice-cache` is a process-wide singleton and never evicts the file-contents entries.** See `node_modules/nice-cache/lib/nice-cache.js`: `singleton` defaults true (so every `new Cache()` after the first returns the same instance), and `refreshInterval` only re-runs explicitly `sub()`-scribed keys — `get-component.ts` uses `set`/`get` only, so **`refreshInterval` will NOT create cold windows**. Consequences:
   - You **cannot** force repeated cold misses in a long-running process via config. A component is cold exactly once per process.
   - The single-flight scenario (Step 2) must therefore run as a **short burst in a fresh Node process per variant**, not as a sustained bombardier run.
5. **Single-flight is disabled when `conf.hotReloading` is true** (by design: `get-component.ts` uses `conf.hotReloading ? loadTemplate() : singleFlight(...)`). Do not enable hotReloading in the single-flight scenario, or you will measure the "off" path in both arms.
6. **The concurrency cap is a hardcoded `pLimit(10)`** in `components.ts` and `nested-renderer.ts`. It is not configurable; A/B (old unbounded vs new capped) is the only way to compare.
7. **The committed baseline `test/results/benchmarks/server-benchmark-baseline.json` is stale** (Plan 001 review saw a +310% swing on it). Ignore the tool's "vs Baseline" print. The only trustworthy comparison is a same-machine A/B (Step 5). Result JSON files in `test/results/benchmarks/` are git-ignored.

## Current State

Relevant files:

| File | Role |
|------|------|
| `packages/oc/tasks/benchmarks/server-benchmark.js` | Scenario definitions, registry startup, bombardier runner, aggregation, comparison. |
| `packages/oc/tasks/benchmarks/storage-adapter.js` | Simulated storage adapter with per-read latency (`minLatencyMs`/`maxLatencyMs`, default 8–30ms). No concurrency counter yet. |
| `packages/oc/test/fixtures/benchmark-components/welcome-with-plugin` | The only component copied into storage fixtures today (`prepareStorageFixtures`, `server-benchmark.js:208`). |
| `packages/oc/test/fixtures/components/*` | Many distinct local components (welcome, hello-world, no-containers, language, empty, lodash-component, ...). Used by the `local` registry. |

Key anchors in `server-benchmark.js`:

- `runBombardier` args builder: lines ~239–306.
- Per-run invocation with hardcoded `method: 'GET'`: lines ~505–517.
- `startRegistry(scenario, options)` local vs storage branches: lines ~382–461.
- `buildScenarios()`: lines ~463–486.
- `prepareStorageFixtures()` `componentsToCopy`: lines ~202–237.
- `getScenarioOptions` / `baseOptions` (connections default 100, duration 15s, storage latency 8–30ms): lines ~615–645.

Batch endpoint contract (confirmed in `packages/oc/src/registry/routes/components.ts`):

- Route: `POST /` (registry prefix `/`).
- Body: `{ "components": [ { "name": string, "version": string, "parameters"?: object } ], "parameters"?: object, "omitHref"?: boolean }`.
- Response: `200` with a JSON array in input order. Errors are per-entry results, not a failed request.
- Accept header `application/json` (already the harness `DEFAULT_HEADERS`).

## Commands You Will Need

Run from repo root.

| Purpose | Command |
|---|---|
| Verify bombardier | `bombardier --version` |
| Build `oc` (required before every bench run; tests run against `dist`) | `npm --workspace packages/oc run build` |
| Run only the new batch scenario | `npm --workspace packages/oc run bench -- --scenarios=batch-storage --repetitions=3` |
| Run the single-flight burst harness (Step 2 script) | `node packages/oc/tasks/benchmarks/single-flight-burst.js` |
| Existing quick bench (sanity) | `npm --workspace packages/oc run bench:quick` |

Note: `npm run bench` passes flags after `--`. Confirm arg parsing in `main()` (`--key=value` form, `parseArguments`, `server-benchmark.js:579`).

## Scope

**In scope**:

- `packages/oc/tasks/benchmarks/server-benchmark.js` (add scenarios + POST/body support).
- `packages/oc/tasks/benchmarks/storage-adapter.js` (optional: add a peak-concurrency counter for evidence).
- New file `packages/oc/tasks/benchmarks/single-flight-burst.js` (standalone burst harness).
- Optionally expand storage fixtures to more distinct components for the batch scenario.
- This plan file and `plans/README.md` status row.

**Out of scope**:

- Any change to `packages/oc/src/**` or `packages/oc-fastify-server-adapter/src/**` behavior. The Plan 001 diff is the device under test and must not be edited (only stashed/unstashed for A/B).
- Changing the hardcoded `pLimit(10)` value.
- Updating the committed baseline JSON.

## Steps

### Step 1: Add a batch fan-out HTTP scenario (tests bounded concurrency)

**1a. Teach `runBombardier` to POST a body.**

- In `server-benchmark.js`, extend the `options` consumed by `runBombardier` to include `method` and `body`. When `body` is set, append bombardier args `-m <method>` (already present via `options.method`) and `-b <body>`, and ensure a `Content-Type: application/json` header is present (either push it into the header list here or via the scenario headers).
- At the per-run call site (~line 505), stop hardcoding `method: 'GET'`; use `scenario.method || 'GET'` and pass `scenario.body`.
- bombardier sends the same body to every request; that is what we want.

**1b. Expand storage fixtures to several distinct components** (to get real per-render storage latency AND a true fan-out that is not secretly deduped by single-flight).

- In `prepareStorageFixtures()` `componentsToCopy`, add a handful of distinct components from `packages/oc/test/fixtures/components` that render with **no mandatory parameters** (e.g. `hello-world`, `no-containers`, `empty`, `language`, `lodash-component`). Each must be packaged the same way `welcome-with-plugin/_package` is; if a `_package` build is required, package them (see `tasks/build.js` / how `_package` dirs are produced) or reuse already-packaged fixtures. VERIFY the storage registry serves them (a single manual GET returns 200) before load testing.
- Rationale: distinct components isolate the concurrency cap (Step 2 subject) from single-flight (Step 1-of-plan-001 subject). Repeating the *same* component in a batch would let single-flight dedupe the cold loads and conflate the two effects.

**1c. Add the scenario.** In `buildScenarios()` add:

```js
{
  key: 'batch-storage',
  title: 'Batch route fan-out (storage + plugin)',
  urlPath: '/',
  method: 'POST',
  // body built from the distinct components copied in 1b, e.g. 20 entries:
  body: JSON.stringify({
    components: [
      { name: 'hello-world', version: '1.0.0' },
      { name: 'no-containers', version: '1.0.0' },
      /* ...repeat the distinct set to reach ~20-40 entries... */
    ]
  })
}
```

- Wire `startRegistry` so `batch-storage` uses the storage branch (reuse the `storage-simulated` setup path; match on the new key alongside the existing keys at `server-benchmark.js:403`).
- Keep default connections (100) and duration (15s). Consider a second run at higher `--connections` to stress the cap.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run bench -- --scenarios=batch-storage --repetitions=3` -> exit 0, `success=100.00%` on every run (a non-100% success rate means the body/params are wrong — fix before trusting numbers).

Record for this scenario: `rps`, `latencyP95Ms`, `latencyP99Ms` (available in `rawResult`), `successRate`, and `resourceUsage` heap/RSS/CPU deltas.

### Step 2: Add a single-flight cold-burst harness (tests dedupe)

Because of harness fact #4 (singleton cache, no eviction) this must be a **standalone script run in a fresh process per arm**, not a bombardier scenario.

Create `packages/oc/tasks/benchmarks/single-flight-burst.js` that:

1. `require('../../dist')` and build an **instrumented repository** (or wrap `createStorageAdapter`) whose `getDataProvider`, `getCompiledView`, and `getEnv` (or the underlying `getFile`/`getJson`) each:
   - increment a call counter, and
   - add a fixed latency (e.g. 30ms) to widen the cold window.
2. Construct the component render entrypoint against a **cold** cache. Prefer the highest-level entrypoint that still lets you inject the instrumented repository — either a real `oc.Registry` with the simulated storage adapter, or `GetComponentHelper(conf, repository)` from `dist/registry/routes/helpers/get-component.js` (mirror how `packages/oc/test/unit/registry-routes-helpers-get-component.js` builds a mocked repository).
3. Fire **N concurrent** renders (e.g. N = 50 and 200) of the **same** component/version at t=0.
4. Wait for all to resolve, then print:
   - `getDataProvider` / `getCompiledView` / `getEnv` call counts,
   - peak concurrent downstream reads (track an in-flight counter in the instrumented repo),
   - wall-clock from first dispatch to last resolve,
   - `process.memoryUsage().rss` / `heapUsed` peak (sample during the burst) and delta.
5. `process.exit(0)`.

Expected NEW behavior: each downstream method called **once**; peak concurrency ~1; wall-clock ≈ one storage round-trip + one compile. Expected OLD behavior: each called **N** times; peak concurrency ~N; higher heap and CPU.

Keep the script self-contained and deterministic (fixed latency, fixed N, no bombardier). Run each arm in its own `node` invocation so the singleton cache starts cold.

**Verify**: `node packages/oc/tasks/benchmarks/single-flight-burst.js` -> exit 0 and prints the counters. On the current (NEW) tree, downstream call counts must be `1`. If they are `N`, the script is not hitting the single-flight path (check: cache cold? same cache key? `hotReloading` false? same `getComponent` instance across the N calls?) — fix before proceeding.

### Step 3: Optional — peak-concurrency evidence in the storage adapter

To get a second, independent signal for both scenarios, add an in-flight counter to `storage-adapter.js` `withLatency` (increment on entry, decrement on exit, track max) and expose the max via a getter or an end-of-run log. This directly shows unbounded (old) vs capped/deduped (new) downstream concurrency. Optional but strong evidence.

### Step 4: Baseline the NEW tree

With the Plan 001 changes present in the working tree (the current state):

1. `npm --workspace packages/oc run build`
2. `npm --workspace packages/oc run bench -- --scenarios=batch-storage --repetitions=5` — record all metrics.
3. `node packages/oc/tasks/benchmarks/single-flight-burst.js` (run 3×) — record counts, peak concurrency, wall-time, RSS.

Label these results **NEW**.

### Step 5: A/B — measure the OLD tree, then restore

Stash **only the Plan 001 product-code changes** (path-scoped, so the new benchmark tooling from Steps 1–3 stays in place). The Plan 001 `oc` source files are:

```
packages/oc/src/registry/routes/helpers/get-component.ts
packages/oc/src/registry/routes/components.ts
packages/oc/src/registry/domain/nested-renderer.ts
packages/oc/src/registry/domain/version-handler.ts
packages/oc/src/registry/domain/validators/plugins-requirements.ts
packages/oc/src/registry/domain/events-handler.ts
packages/oc/src/registry/middleware/index.ts
packages/oc/src/registry/domain/http-server/express-adapter.ts
```

1. `git stash push -m plan001-src -- <the 8 files above>` (list them explicitly on the command line).
2. Confirm the benchmark tooling changes (`tasks/benchmarks/*`) and the new script are still present (`git status`).
3. `npm --workspace packages/oc run build`
4. Re-run the exact same commands as Step 4. Label results **OLD**.
5. `git stash pop` to restore the Plan 001 changes.
6. `npm --workspace packages/oc run build` (leave `dist` matching the NEW tree so the worktree ends as it started).
7. `git status` must show the same 15 Plan 001 files modified plus the new benchmark tooling; nothing from Plan 001 dropped.

Reduce noise: close other apps, run on AC power, run Step 4 and Step 5 back-to-back, keep repetitions ≥ 5 for the HTTP scenario and ≥ 3 for the burst script.

### Step 6: Report

Produce a short markdown table NEW vs OLD for:

- **batch-storage**: rps, p95, p99, success, heapUsed delta, rss delta, cpuUserTime delta (avg/min/max).
- **single-flight burst**: downstream call counts, peak concurrency, wall-time, peak RSS — for N=50 and N=200.

State a clear verdict per change:

- Single-flight: kept-with-evidence, or "no measurable benefit under adversarial burst -> recommend dropping".
- Bounded fan-out: protective win and/or no throughput regression, or a regression (if capped rps is materially below unbounded for large batches, flag it — the cap of 10 may be too low).

Do not overfit to noise; if runs disagree beyond ~5%, run once more and report the range.

## Implementation Results

Measured on the same `darwin-arm64` machine with Node `v26.5.0`. The NEW and OLD batch runs used five repetitions, 100 connections, 15-second runs, 20 distinct component names, and 100% success. Each burst result is the average of three fresh-process runs.

### Batch storage

| Metric | NEW capped | OLD unbounded | Result |
|---|---:|---:|---:|
| RPS average (min-max) | 524.06 (511.85-537.82) | 581.05 (567.97-587.58) | -9.8% |
| P95 ms average (min-max) | 233.06 (226.59-241.80) | 248.30 (239.01-260.03) | -6.1% |
| P99 ms average (min-max) | 261.04 (247.69-274.21) | 277.55 (271.27-288.50) | -5.9% |
| Success | 100% | 100% | equal |
| Storage peak concurrency average | 998.2 | 2000.2 | -50.1% |
| Heap delta MB average (min-max) | 16.2 (-45-103) | 14.6 (-42-89) | noisy/inconclusive |
| RSS delta MB average (min-max) | 45.0 (-17-217) | 62.8 (-9-312) | noisy; NEW lower |
| CPU user seconds average (min-max) | 17.24 (17.13-17.42) | 17.63 (17.49-17.85) | -2.2% |

**Bounded fan-out verdict**: the cap is a clear protective win: downstream peak concurrency was halved and P95/P99 improved by about 6%. It also reduced throughput by about 9.8% in this adversarial 20-item, 100-connection workload. Keep the protection, but flag the hardcoded limit of 10 as a throughput trade-off that may need tuning for large legitimate batches.

### Single-flight cold burst

| N | Tree | Calls per downstream method | Peak downstream concurrency | Wall ms average | Peak RSS delta MB average | Peak heap delta MB average |
|---:|---|---:|---:|---:|---:|---:|
| 50 | NEW | 1 | 1 | 95.57 | 3.41 | 0.00 |
| 50 | OLD | 50 | 50 | 112.24 | 11.84 | 8.81 |
| 200 | NEW | 1 | 1 | 97.61 | 4.00 | 2.28 |
| 200 | OLD | 200 | 200 | 153.11 | 51.51 | 37.22 |

**Single-flight verdict**: keep with evidence. It deterministically collapsed all three cold downstream loads (`getEnv`, `getDataProvider`, and `getCompiledView`) from N to 1. At N=200 it reduced average wall time by 36%, peak RSS delta by 92%, and peak heap delta by 94%.

## Test Plan / Verification

- `bombardier --version` succeeds.
- `npm --workspace packages/oc run build` -> exit 0 (both arms).
- batch-storage runs at `success=100.00%` (both arms). A <100% rate invalidates the run.
- single-flight-burst prints downstream call count `1` on NEW and `N` on OLD. If NEW is not 1, the scenario is mis-wired (STOP).
- Worktree after Step 5 shows the original 15 Plan 001 files + new benchmark tooling; no Plan 001 change lost.

## Done Criteria

- [x] `runBombardier` supports POST + JSON body; batch-storage scenario added and green at 100% success.
- [x] Distinct-component storage fixtures serve 200s before load testing.
- [x] `single-flight-burst.js` exists, runs in a fresh process, and shows 1 (new) vs N (old) downstream loads.
- [x] NEW vs OLD A/B recorded for both scenarios on the same machine (committed stale baseline ignored).
- [x] Per-change verdict written (single-flight, bounded fan-out).
- [x] Plan 001 working-tree changes restored intact after A/B.
- [x] `plans/README.md` status row for 002 updated.

## STOP Conditions

- `bombardier` missing and cannot be installed (`brew install bombardier`).
- single-flight-burst shows `N` downstream loads on the NEW tree after reasonable debugging (means the burst is not reaching the single-flight path — report rather than force a green).
- batch-storage cannot reach 100% success (fixtures/params wrong) — fix or report; do not report throughput from failing requests.
- A/B requires editing `packages/oc/src/**` beyond stash/unstash.
- `git stash pop` conflicts or drops a Plan 001 change — stop and report; do not hand-reconstruct.
- Two full A/B passes disagree in direction (one shows win, one shows regression) beyond noise — report as inconclusive rather than cherry-picking.

## Notes for the reporter

- The purpose is a go/no-go on single-flight and confirmation that the fan-out cap doesn't regress large batches — not to make `bench:quick` faster (it won't move; those scenarios don't touch this code).
- If single-flight shows no benefit, that is an acceptable, useful outcome: recommend dropping it from Plan 001 and keeping the timer-leak fix (Step 5 of Plan 001), the fan-out cap (as protection), and the micro-opts.
