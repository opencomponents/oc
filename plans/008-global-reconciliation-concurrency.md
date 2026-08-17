# Plan 008: Enforce one storage concurrency budget during legacy reconciliation

> **Executor instructions**: Implement this as an independent storage-startup PR. Preserve reconciliation results and ordering; change only scheduling and its tests. Update `plans/README.md` when complete unless a reviewer owns it.
>
> **Drift check (run first)**: `git diff --stat 0564f540..HEAD -- packages/oc/src/registry/domain/components-cache/components-list.ts packages/oc/src/utils/map-with-concurrency.ts packages/oc/test/unit/utils-map-with-concurrency.js packages/oc/test/unit/registry-domain-components-cache.js plans/README.md`
> Stop if reconciliation no longer has nested per-component and outer limiters as described below.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `plans/003-manifest-work-parity-benchmarks.md`
- **Category**: perf
- **Planned at**: commit `0564f540`, 2026-08-17

## Why this matters

Legacy storage reconciliation creates one limiter for component traversal and another limiter inside every active component for package-integrity reads. With adapter capacity M, the nested independent queues can admit roughly M² integrity requests. One shared limiter makes the adapter's configured maximum real, reducing startup throttling, connection pressure, and queued promise memory without changing which versions are accepted.

## Current state

In `packages/oc/src/registry/domain/components-cache/components-list.ts`:

```ts
// lines 34-57, inside every component
const limit = pLimit(cdn.maxConcurrentRequests);
const invalidVersions = (
  await Promise.all(
    unCheckedVersions.map((unCheckedVersion) =>
      limit(async () => validateComponentVersion(componentName, unCheckedVersion))
    )
  )
).filter(...);
```

```ts
// lines 75-85, outer traversal
const components = await cdn.listSubDirectories(...);
const limit = pLimit(cdn.maxConcurrentRequests);
const versions = await Promise.all(
  components.map((component) => limit(() => getVersionsForComponent(component)))
);
```

The inner limiter is created once per component, so its active count is not coordinated with other components. `packages/oc/test/unit/registry-domain-components-cache.js` already stubs `listSubDirectories`, `getJson`, and `maxConcurrentRequests`; extend this pattern with an active-operation counter.

## Commands you will need

Run from repository root.

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm --workspace packages/oc run build` | exit 0 |
| Tests | `npm --workspace packages/oc run test-silent` | exit 0 |

## Scope

**In scope**:

- `packages/oc/src/registry/domain/components-cache/components-list.ts`
- New `packages/oc/src/utils/map-with-concurrency.ts`
- New `packages/oc/test/unit/utils-map-with-concurrency.js`
- `packages/oc/test/unit/registry-domain-components-cache.js`
- `plans/README.md` status update

**Out of scope**:

- Serving cached metadata before reconciliation.
- Coalescing publish-triggered refreshes.
- Changing `cdn.maxConcurrentRequests` or adding public config.
- Batch/nested render scheduling.
- Changing integrity-validation rules or error messages.

## Git workflow

- Branch: `advisor/008-reconciliation-concurrency`
- Suggested commit: `perf(registry): share reconciliation storage limit`
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 1: Add a failing global-concurrency test

In `registry-domain-components-cache.js`, create a fixture with:

- at least three components;
- at least three unchecked versions per component;
- `maxConcurrentRequests` set to 2;
- delayed per-component `listSubDirectories` calls and delayed integrity `getJson` calls that share one increment/decrement active counter;
- per-operation call counts and a tracked maximum active count.

Run `componentsCache.load()` and assert:

- all expected versions are returned in the same shape/order as current code;
- maximum concurrent storage operations subject to the limit never exceeds 2;
- all counters return to zero after success;
- rejected/corrupt versions still produce the existing error behavior.

The max-active assertion should fail against nested independent limiters.

**Verify**: temporarily run the new test file directly with `npx mocha --timeout 20000 packages/oc/test/unit/registry-domain-components-cache.js` after building; the new max-concurrency assertion fails before the production change while existing assertions pass. Do not commit the failing state.

### Step 2: Add an indexed worker-pool mapper

Create `packages/oc/src/utils/map-with-concurrency.ts` with this API:

```ts
export default function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  concurrency: number,
  worker: (item: Input, index: number) => Promise<Output>
): Promise<Output[]>;
```

Required implementation shape:

- preallocate the output array;
- keep one shared next-index integer;
- start exactly `min(concurrency, items.length)` asynchronous worker loops;
- each loop claims one index, awaits that operation, stores by index, then claims the next;
- aggregate only those worker-loop promises;
- never create one promise, bound closure, queue node, or `pLimit` call per input before it becomes active;
- preserve output order;
- validate concurrency like `pLimit` does;
- empty input resolves to an empty array.

Add a 10,000-item deferred test proving only `concurrency` worker operations are invoked before any deferred item resolves, each resolution admits at most one next item, peak active work is bounded, output order is preserved, and the utility does not eagerly invoke the remaining worker callbacks.

Characterize rejection behavior before integration. Preserve the existing externally visible rejection type and ensure no unhandled rejections remain. If existing reconciliation tests require queued work to continue after the first directory-list failure, encode that explicitly; otherwise use fail-fast worker admission and stop scheduling new work after the first failure.

**Verify**: build, utility test, and full tests → exit 0.

### Step 3: Apply one non-nested operation budget

After the single root-directory listing, use `mapWithConcurrency` with `cdn.maxConcurrentRequests` in this required two-phase schedule:

1. map all component names to per-component `listSubDirectories(componentPath)` results;
2. after all version-list worker loops release their slots, derive compact unchecked-version descriptors;
3. map those descriptors to package-integrity `getJson` results with the same configured concurrency;
4. assemble results by original component index and preserve existing semver sorting.

Only `O(cdn.maxConcurrentRequests)` scheduling/operation promises may be live in either phase. A compact descriptor array is acceptable; an eager array of promises, bound queue closures, or queue nodes is not. Do not nest one bounded mapper inside another or hold a worker slot while awaiting work submitted to the same pool.

Preserve result association, corruption events, and existing error propagation.

**Verify**: `npx mocha --timeout 20000 packages/oc/test/unit/utils-map-with-concurrency.js packages/oc/test/unit/registry-domain-components-cache.js` → exit 0; measured max active is at most 2 and the 10,000-item test admits no eager work.

### Step 4: Cover failure and capacity edges

Add tests for:

- capacity 1 serializes integrity reads;
- capacity greater than total work completes normally;
- one `getJson` rejection marks only that version invalid as today;
- one component directory-list rejection follows existing top-level error handling;
- empty registry and components with no unchecked versions perform no integrity reads;
- no queued operation remains after rejection/completion.

Do not swallow new classes of errors.

**Verify**: full unit suite → exit 0.

### Step 5: Run package verification

Run build and full tests. If Plan 003's storage metrics can exercise startup reconciliation without benchmark redesign, record peak concurrency once; do not expand scope solely to add a new benchmark scenario.

**Verify**: command table succeeds.

## Test plan

- Instrument both per-component directory listings and integrity reads with one active counter; do not infer concurrency from promise counts.
- Use deferred promises so the test controls overlap deterministically.
- Assert output equality and corruption events in addition to max concurrency.
- Ensure the reconciliation test fails with separate inner limiters and the utility test fails if all per-item promises/callbacks are admitted eagerly.

## Done criteria

- [ ] One indexed worker-pool budget governs all per-component directory listings and integrity reads after the root listing.
- [ ] A shared counter across `listSubDirectories` and `getJson` never exceeds `cdn.maxConcurrentRequests`.
- [ ] Scheduling creates only `O(cdn.maxConcurrentRequests)` live worker/operation promises, proven by the 10,000-item admission test.
- [ ] No nested-await deadlock or eager per-item promise queue is possible.
- [ ] Component/version output and semver ordering are unchanged.
- [ ] Corrupt-version and directory-error behavior is unchanged.
- [ ] Build and tests pass.
- [ ] No batch-render scheduler or public config changed.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- The indexed worker pool cannot preserve reconciliation rejection behavior without eager per-item promises, unhandled rejections, or changes outside the in-scope utility/cache files.
- The adapter's `maxConcurrentRequests` is absent, non-finite, or intentionally interpreted per component.
- Existing tests establish that more than M concurrent integrity reads are required behavior.
- Preserving current error behavior requires modifying unrelated cache modules.

## Maintenance notes

- Any future reconciliation stage that performs storage I/O must use the indexed worker-pool pattern rather than creating a local limiter or eager per-item promise queue.
- Do not automatically reuse this worker-pool policy for HTTP batch rendering; the resource and fairness semantics differ.
