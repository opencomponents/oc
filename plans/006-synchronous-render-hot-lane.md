# Plan 006: Keep the successful render path synchronous and allocation-light

> **Executor instructions**: Implement this plan as one hot-path PR after the cache PRs. Preserve the explicit public ordering invariants in this plan; the only intended timing change is removal of an internal warm-env microtask. Stop if tests or documentation establish a stronger callback-ordering contract. Update `plans/README.md` when complete unless a reviewer owns it.
>
> **Drift check (run first)**: `git diff --stat 0564f540..HEAD -- packages/oc/src/registry/routes/helpers/get-component.ts packages/oc/src/registry/routes/helpers/get-component-retrieving-info.ts packages/oc/src/registry/domain/nested-renderer.ts packages/oc/src/registry/domain/events-handler.ts packages/oc/test/unit plans/README.md`
> Plans 003–005 are expected to change cache ownership and the plans index. Confirm the async functions and callback adapters described below still exist before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/005-bounded-component-manifest-cache.md`
- **Category**: perf
- **Planned at**: commit `0564f540`, 2026-08-17

## Why this matters

The component renderer is callback-driven, but its warm success path creates promises and callback adapters whose return values are discarded. It also builds nested-renderer APIs and retrieval telemetry for every component whether they are used or observed. Batch and nested rendering multiply these allocations. This PR adds a narrow synchronous lane while keeping asynchronous misses, user-code failures, timeout behavior, and local diagnostics compatible.

## Current state

- `packages/oc/src/registry/routes/helpers/get-component.ts:197-200` declares the top-level `renderer` as `async` but contains no top-level `await`.
- `get-component.ts:180-195` declares `getEnv` as async, so even a cache hit becomes a promise/microtask.
- `get-component.ts:386-493` declares `returnComponent` async; only the local error stack-processing branch at lines 471-479 awaits.
- `get-component.ts:201` constructs `NestedRenderer(renderer, options.conf)` on every render.
- `get-component.ts:244`, `627`, and `663-664` call `fromPromise(...)` inside each render, constructing stable callback adapters repeatedly.
- `get-component.ts:201-231` constructs and updates `GetComponentRetrievingInfo` unconditionally.
- `domain/events-handler.ts:65-75` already exposes `hasListeners`; `fire` is a no-op without subscribers.
- `test/unit/registry-routes-helpers-get-component.js` covers success/error events, timeouts, and concurrent cold loads. Preserve those semantics.

## Commands you will need

Run from repository root.

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm --workspace packages/oc run build` | exit 0 |
| Tests | `npm --workspace packages/oc run test-silent` | exit 0 |
| Burst | `npm --workspace packages/oc run bench:burst` | exit 0; deterministic work counts unchanged |
| Capture quick baseline | `npm --workspace packages/oc run bench:quick -- --result-file=/tmp/oc-plan006-quick-before.json` | exit 0 before source edits |
| Capture high-load baseline | `npm --workspace packages/oc run bench:high-load -- --result-file=/tmp/oc-plan006-high-before.json` | exit 0 before source edits |
| Compare quick | `npm --workspace packages/oc run bench:quick -- --baseline-file=/tmp/oc-plan006-quick-before.json --max-rps-regression-percent=5 --max-p95-regression-percent=5 --expect-success-rate=1` | exit 0 after source edits |
| Compare high load | `npm --workspace packages/oc run bench:high-load -- --baseline-file=/tmp/oc-plan006-high-before.json --max-rps-regression-percent=5 --max-p95-regression-percent=5 --expect-success-rate=1` | exit 0 after source edits |

## Scope

**In scope**:

- `packages/oc/src/registry/routes/helpers/get-component.ts`
- `packages/oc/src/registry/routes/helpers/get-component-retrieving-info.ts` if needed
- `packages/oc/src/registry/domain/nested-renderer.ts`
- `packages/oc/src/registry/domain/events-handler.ts` only if a lazy helper is needed
- Focused unit tests under `packages/oc/test/unit`
- Benchmark result interpretation, not benchmark architecture changes
- `plans/README.md` status update

**Out of scope**:

- Removing Node `Domain` from provider execution.
- Parallelizing cold env/provider reads; this sequence rejects it because env failures currently avoid provider reads, so overlap would change error-path work counts.
- Changing component response JSON.
- Changing public callback APIs to promises or vice versa.
- Sharing request-specific context between renders.
- Parameter-schema compilation.

## Git workflow

- Branch: `advisor/006-synchronous-render-lane`
- Suggested commit: `perf(registry): keep warm render orchestration synchronous`
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 0: Capture same-machine baselines

After building the completed Plan 005 tree and before changing source, run both Capture baseline commands. Keep the exact `/tmp/oc-plan006-*-before.json` files unchanged through Step 6. If Plan 003 reports environment/workload drift, recapture both sides from clean commits on the same machine rather than bypassing it.

**Verify**: both baseline files exist, contain the expected scenarios/repetitions, and every run succeeded.

### Step 1: Characterize callback and event timing

Before changing production code, extend helper tests to pin these required post-refactor invariants:

1. the renderer call returns before the public completion callback fires, including fully warm cache hits;
2. repository/component resolution completes before env lookup/provider invocation;
3. provider invocation occurs before its completion result, and synchronous provider throws produce exactly one error result;
4. timeout cleanup occurs before retrieval-event dispatch and the public callback;
5. when observed, `component-retrieved` fires exactly once with final fields immediately before the public callback;
6. local stack enrichment finishes before retrieval-event dispatch/public callback;
7. asynchronous provider success/failure and duplicate callbacks still produce exactly one public completion.

Also record the current relative trace using a simple array of labels (`renderer-return`, `provider`, `event`, `callback`) and a `queueMicrotask` sentinel. The intended change in Step 4 is explicit: on a warm env cache hit, provider continuation may occur one internal microtask earlier, but the public callback must still occur after renderer return and preserve provider → event → callback order. Do not promise ordering relative to unrelated caller-scheduled microtasks. If existing documentation or tests require the extra env microtask, stop.

Use Sinon spies/fake timers and the existing injected repository style.

**Verify**: tests pass against pre-refactor code.

### Step 2: Hoist stable callback adapters

Create stable adapters once per registry render service/helper, not per render:

- repository `getComponent` callback adapter;
- environment miss callback adapter if still needed after Step 4;
- one nested renderer bound to the registry configuration;
- callback adapters for nested `renderComponent` and `renderComponents`.

The nested renderer factory captures only the recursive renderer and registry configuration. Every parent-specific value must remain method arguments or invocation-local state.

If Plan 004 changed helper construction, use that registry-scoped service rather than introducing another singleton.

**Verify**: concurrent nested-render tests and full unit suite pass.

### Step 3: Build retrieval telemetry only at completion when observed

Preserve dynamic listener semantics: today a listener added while a render is in flight receives the completion event, while a listener removed before completion does not.

- Replace the per-render `GetComponentRetrievingInfo` object/closures with one scalar start timestamp, preferably `process.hrtime.bigint()`.
- At callback completion, check `eventsHandler.hasListeners('component-retrieved')` before taking the end timestamp or constructing an event payload.
- When observed, build the complete payload once from `options`, the final `result.response`, final status, and elapsed time. Preserve every existing payload field for success and error responses.
- When unobserved, perform no payload object construction, `Object.assign`, end clock read, or `fire` call. The one start timestamp is retained to preserve the possibility of a listener being added mid-flight.
- Remove `get-component-retrieving-info.ts` only if it has no other callers after this refactor; otherwise leave its public behavior untouched.

Do not change request-level timing middleware in this PR.

**Verify**: event tests cover listener present, absent, added during flight, removed during flight, success, and error with unchanged payloads.

### Step 4: Make environment cache hits synchronous

Refactor environment lookup to return one of two explicit states without wrapping a cache hit in a promise:

- hit: invoke/continue synchronously with the cached env object;
- miss: return/join the existing single-flight promise and continue in `.then`/callback;
- error: preserve current `ENV_RESOLVING_ERROR` behavior;
- hot reload: preserve the behavior established by Plans 004/005.

A tri-state helper or callback-oriented helper is acceptable. Do not invoke repository I/O twice and do not cache failures. This intentionally removes the cached-env promise continuation; preserve the renderer-return-before-callback and provider → event → callback invariants from Step 1 rather than the old count of internal microtasks.

Add a test proving a warm env hit schedules no new repository call and no additional promise-returning adapter is constructed.

**Verify**: helper tests and burst work counts pass.

### Step 5: Remove unused async frames from the success path

- Remove `async` from the top-level callback renderer when its returned promise is unused.
- Make normal `returnComponent` completion synchronous.
- Move local source-map/error-stack processing into a separate cold async function called only for `conf.local && err && err.stack`.
- The cold helper must finish enrichment before invoking the public callback, matching current behavior.
- Keep `componentCallbackDone`, timeout cleanup, `domain.exit`, error identity, renderer-return-before-callback, and provider → event → callback semantics.
- Ensure promise rejection in the cold helper is handled and falls back to the original stack as today.

Do not convert the whole pipeline to promises. The goal is fewer promises on the warm callback path, not a new API.

**Verify**: characterization tests from Step 1 all pass unchanged.

### Step 6: Measure allocations and latency

Run burst plus both Compare commands after a clean build.

Machine gates:

- deterministic downstream work counts unchanged;
- every run success rate exactly 1;
- Plan 003 rejects any scenario with RPS or p95 regression above 5% against the captured compatible baseline;
- callback/event parity tests pass.

Report CPU and peak heap deltas from burst/high-load runs, but do not turn noisy memory samples into a cross-machine pass/fail threshold. Do not optimize benchmarks by skipping user-code calls.

## Test plan

Required coverage:

- listener-present and listener-absent telemetry lanes;
- listener changes during an in-flight render;
- synchronous provider success and throw;
- asynchronous provider success and failure;
- timeout cleanup and hung provider;
- local stack enrichment success/failure;
- warm env cache hit and cold single-flight miss;
- concurrent nested renders with no shared parent state;
- exact-once callbacks in every branch.

## Done criteria

- [ ] Top-level callback renderer is not `async` without a suspension.
- [ ] Normal successful completion allocates no discarded completion promise.
- [ ] Warm env hits do not suspend through a promise/microtask.
- [ ] Stable `fromPromise` and nested-renderer adapters are constructed once per registry service.
- [ ] Retrieval payload allocation and completion timing are skipped when no listener exists at completion, while mid-flight listener add/remove semantics remain unchanged.
- [ ] Timeout, Domain, local diagnostics, response behavior, and the explicit renderer-return/provider/event/callback ordering invariants are preserved.
- [ ] Work counts are unchanged and both Plan 003 same-machine 5% comparison gates pass.
- [ ] Build and tests pass.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- Existing tests or consumers require the renderer's ignored returned promise.
- Tests or documentation require the extra warm-env microtask or any callback ordering stronger than the explicit invariants in Step 1.
- Hoisting nested adapters captures parent request state.
- Error enrichment cannot be split without changing which callback/error instance is observed.
- Exact-once behavior becomes ambiguous in a branch.
- Comparable benchmarks regress consistently by more than 5%.

## Maintenance notes

- Keep user callbacks/thenables duck-typed at public boundaries; use cheaper internal checks only where both sides are controlled.
- Any new instrumentation should have a no-listener eligibility gate before allocating payload state.
- Reviewers should focus on exact-once completion and callback timing, not only throughput numbers.
