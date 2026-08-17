# Plan 005: Cache immutable component manifests after version resolution

> **Executor instructions**: Implement this as a separate PR after Plan 004. Follow all parity and benchmark gates; manifest caching is not acceptable without mutation isolation and bounded memory. Update `plans/README.md` on completion unless a reviewer owns it.
>
> **Drift check (run first)**: `git diff --stat 0564f540..HEAD -- packages/oc/src/registry/domain/repository.ts packages/oc/src/utils/bounded-cache.ts packages/oc/src/registry/routes/index.ts packages/oc/src/registry/routes/component-info.ts packages/oc/src/registry/routes/component-preview.ts packages/oc/test/unit packages/oc/tasks/benchmarks/single-flight-burst.js plans/README.md`
> Plans 003 and 004 are expected to change benchmark and cache files. Stop if repository or route manifest-consumer behavior no longer matches the Current state section after accounting for those plans.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: `plans/004-registry-scoped-artifact-cache.md`
- **Category**: perf
- **Planned at**: commit `0564f540`, 2026-08-17

## Why this matters

Every warm render currently retrieves and parses an immutable component-version `package.json`. Storage registries pay a backend round trip; local registries reread source and packaged manifests, including synchronous filesystem work. Batch and discovery routes multiply this cost. This PR adds a bounded repository-owned manifest cache and repository-level single-flight while removing mutations that would make reference reuse unsafe.

## Current state

- `packages/oc/src/registry/domain/repository.ts:227-260` resolves versions, fetches component info, then mutates the fetched object with `allVersions`.
- `repository.ts:167-189` reads the local source `package.json` to determine one version on every call.
- `repository.ts:265-290` synchronously reads local `_package/package.json` or calls storage `cdn.getJson(.../package.json)` on every call.
- Metadata mode atomically reserves versions, but legacy storage mode only checks `repository.ts:460-467` before upload and refreshes its versions snapshot asynchronously after `putDir`. Concurrent legacy publishes can both pass the pre-check, so successful publish must invalidate the exact cache key and guard against stale in-flight loads.
- Known consumers mutate returned manifests:
  - `routes/index.ts:26-27` rewrites `author`;
  - `routes/index.ts:57-67` adds `oc.stringifiedDate`;
  - `routes/component-info.ts:97-101` and `component-preview.ts:54-58` attach `requestVersion` with `Object.assign`.
- Plan 004 provides `BoundedCache` and registry-scoped ownership. Do not put manifests into a process-global cache.

## Commands you will need

Run from repository root.

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm --workspace packages/oc run build` | exit 0 |
| Tests | `npm --workspace packages/oc run test-silent` | exit 0 |
| Burst | `npm --workspace packages/oc run bench:burst` | exit 0; one manifest read for N=50 and N=200 |
| Capture storage baseline | `npm --workspace packages/oc run bench -- --scenarios=storage-simulated --repetitions=3 --result-file=/tmp/oc-plan005-storage-before.json` | exit 0 before source edits |
| Capture batch baseline | `npm --workspace packages/oc run bench -- --scenarios=batch-storage --repetitions=3 --result-file=/tmp/oc-plan005-batch-before.json` | exit 0 before source edits |
| Verify storage | `npm --workspace packages/oc run bench -- --scenarios=storage-simulated --repetitions=3 --baseline-file=/tmp/oc-plan005-storage-before.json --max-rps-regression-percent=5 --max-p95-regression-percent=5 --expect-package-reads=1,0,0 --expect-success-rate=1` | exit 0 after source edits |
| Verify batch | `npm --workspace packages/oc run bench -- --scenarios=batch-storage --repetitions=3 --baseline-file=/tmp/oc-plan005-batch-before.json --max-rps-regression-percent=5 --max-p95-regression-percent=5 --expect-package-reads=0,0,0 --expect-success-rate=1` | exit 0 after source edits |

## Scope

**In scope**:

- `packages/oc/src/registry/domain/repository.ts`
- `packages/oc/src/utils/bounded-cache.ts` only if a generic method needed by manifests is missing
- `packages/oc/src/registry/routes/index.ts`
- `packages/oc/src/registry/routes/component-info.ts`
- `packages/oc/src/registry/routes/component-preview.ts`
- Relevant repository and route tests under `packages/oc/test/unit`
- `packages/oc/tasks/benchmarks/single-flight-burst.js` manifest assertion update
- `plans/README.md` status update

**Out of scope**:

- Caching arbitrary failed/not-found requests.
- Returning one mutable manifest object to callers.
- Public cache configuration.
- Parameter-schema compilation; deferred to a later plan.
- Changing version-range semantics.
- Changing HTTP response fields.

## Git workflow

- Branch: `advisor/005-component-manifest-cache`
- Suggested commit: `perf(registry): cache immutable component manifests`
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 0: Capture same-machine storage and batch baselines

After building the completed Plan 004 tree and before changing source, run both Capture baseline commands. Keep the two exact `/tmp/oc-plan005-*-before.json` files unchanged through Step 5. If Plan 003 rejects environment/workload compatibility later, recapture both sides from clean commits on the same machine; do not bypass the check.

**Verify**: both baseline files exist, contain three successful repetitions, and include package-read metrics.

### Step 1: Make manifest consumers non-mutating

Before caching, remove known in-place mutations:

- In `repository.getComponent`, return a new top-level object containing `allVersions`; never `Object.assign` into the cached manifest.
- In `routes/index.ts`, derive parsed author and stringified date in view-model objects without assigning into the repository object or nested `component.oc`.
- In component info and preview routes, create response objects with spread/explicit fields instead of `Object.assign(component, ...)`.

Add regression tests using recursively frozen repository-returned fixtures and exercise index, info, preview, and render paths. The routes must succeed without writes to the input object, and response JSON must remain identical. Attempt mutations at the top level and within `oc.files`, parameter definitions, dependencies, and arrays; cache-owned nested state must never be writable through a returned value.

**Verify**: build and tests → exit 0 before adding caching.

### Step 2: Add repository-owned manifest cache and single-flight

Inside `repository(conf)` create:

- `BoundedCache` with **1000 manifest entries**;
- `Map<string, { promise: Promise<Component>; invalidated: boolean }>` for ephemeral in-flight manifest loads;
- a key based on resolved component name and exact version, never the requested range alone.

Required behavior:

1. Resolve the request to an exact version from the current versions snapshot.
2. On a cache hit, return a request-safe top-level result with the current `allVersions` value.
3. On a miss, share one in-flight `getComponentInfo(name, exactVersion)` operation.
4. Cache only successful results.
5. Delete in-flight entries in `finally`.
6. Bypass resolved manifest caching when `conf.local && conf.hotReloading`.
7. Keep caches scoped to the repository instance.
8. Do not cache not-found, invalid-version, or storage errors.

Recursively freeze the JSON-derived cached manifest, including nested objects and arrays. Return a new top-level wrapper only to attach current `allVersions`; all nested cache-owned references remain recursively frozen. Refactor every known consumer to derive response/view data without mutation. Do not deep-clone the full manifest on every hit; if a caller requires mutable nested state, treat that as a STOP condition rather than silently sharing or cloning it.

**Verify**: repository unit tests → all pass.

### Step 3: Cache local version metadata only when hot reload is disabled

For local mode, avoid rereading the source `package.json` on every request when `hotReloading === false`.

- Add a repository-instance map from component name to its one current local version.
- Populate it on first successful read or during existing component discovery.
- Coalesce concurrent first reads.
- Do not use it when hot reloading is enabled.
- Preserve special `oc-client` version behavior.

Do not introduce synchronous filesystem reads into new paths.

**Verify**: tests must assert one local source-manifest read across repeated non-hot-reload calls and repeated reads under hot reload.

### Step 4: Invalidate exact keys safely after publication

Treat successful publication as an exact-key invalidation boundary even though normal versions are intended to be immutable.

- Represent each in-flight load as an ephemeral entry containing its promise and an `invalidated` flag; do not create a persistent per-key generation map.
- Cache a loaded manifest only when its own entry was not invalidated.
- Make single-flight cleanup identity-safe: an older entry's `finally` deletes the map key only when the map still points to that same entry.
- After every successful legacy `cdn.putDir`, delete the exact manifest cache entry, mark any current in-flight entry invalidated, and detach it from the map before scheduling asynchronous component-list refresh.
- After a successful metadata commit, apply the same exact-key invalidation before/with `metadataIndex.add`; duplicate/failed reservations must not invalidate successful cached content.
- A request already using an invalidated in-flight result may finish with its request snapshot, but future requests after publish completion must neither join nor cache that stale operation.
- Invalidation metadata must exist only as part of live in-flight entries and become collectible when those promises settle; add no auxiliary map that grows with published versions.
- Cached `allVersions` is never stored with the manifest; each response uses the current versions snapshot.
- Never flush unrelated component/version entries.

Add two deterministic legacy tests:

1. For a version already present in the stubbed versions snapshot, stub duplicate-version validation only within the test so two deferred uploads can exercise exact-key invalidation. Start an old manifest load, complete both uploads in a controlled order, then prove the old load cannot repopulate the cache and the first subsequent read returns the last uploaded content.
2. For a genuinely new same-version concurrent publish, preserve production behavior: after both publish promises settle, explicitly resolve/await the stubbed background refresh chain before reading through `getComponent`. Do not require publication to await reconciliation and do not change publish response timing.

Also publish more than 1000 distinct keys in a focused test and assert there is no persistent generation/invalidation map; auxiliary state is bounded by currently in-flight loads only.

**Verify**: publish tests for successful, concurrent duplicate, interleaved read, and failed commit paths → all pass.

### Step 5: Update deterministic benchmark assertions

Change Plan 003's burst expectation from repeated manifest reads to exactly one manifest read for N=50 and N=200. Keep artifact read assertions at one each.

Use Plan 003's storage operations grouped by package path; do not add an internal cache-miss metric in this PR.

Exact acceptance gates:

- burst manifest storage work equals one for N=50 and N=200;
- storage-simulated success remains 100%, the first timed run performs at most one component package read, and timed runs 2–3 perform zero package reads;
- batch-storage preflight may warm each distinct component once, but metrics are reset afterward, so every timed run performs zero component package reads and remains 100% successful;
- a focused 1001-key unit test reports cache size exactly 1000 and confirms the true LRU key was evicted;
- two same-machine three-repetition runs do not show a consistent throughput or p95 regression above 5%.

**Verify**: burst plus both Verify commands in the command table → exit 0; Plan 003 enforces exact work counts, success, compatible workloads, and 5% timing thresholds.

## Test plan

Add tests for:

- repeated exact version → one `getJson`;
- concurrent exact version → one `getJson`;
- repeated semver range resolving to one exact version → one manifest load;
- rejection → no cached error and successful retry calls storage again;
- 1001 keys → bounded size and LRU eviction;
- separate repository instances with identical keys → no value leakage;
- current `allVersions` after a later publish while base manifest remains cached;
- local hot reload bypass;
- local non-hot-reload source and packaged manifests read once;
- recursively frozen manifest input accepted by index/info/preview routes without mutation;
- attempted nested mutation of files, parameters, dependencies, and arrays cannot alter later reads;
- concurrent legacy same-version publishes plus an interleaved read cannot repopulate stale cache state;
- an invalidated old in-flight promise cannot delete or replace a newer in-flight entry;
- invalidation state is ephemeral and remains bounded by active in-flight loads across more than 1000 unique publishes;
- unchanged response bodies.

Model repository stubbing and async completion on `packages/oc/test/unit/registry-domain-repository.js`.

## Done criteria

- [ ] Manifest cache is repository-scoped and bounded to 1000 entries.
- [ ] In-flight manifest loads coalesce and clean up after resolve/reject.
- [ ] Storage benchmark package-read counts meet the exact run-by-run gates in Step 5.
- [ ] Local non-hot-reload renders do not reread source or packaged manifests per request.
- [ ] Hot reload still observes manifest changes.
- [ ] Cached manifests are recursively frozen and no consumer mutates cache-owned nested state.
- [ ] Every successful publish invalidates only its exact key, and ephemeral entry/identity guards prevent stale in-flight repopulation without an unbounded generation map.
- [ ] `allVersions` remains current and is not frozen into a stale cache entry.
- [ ] Burst manifest work is exactly one for both burst sizes.
- [ ] Response contracts, build, tests, and benchmarks pass.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- A consumer outside the listed scope intentionally mutates repository manifests.
- Manifest identity or mutability is a documented/public contract.
- Exact-key invalidation plus ephemeral-entry identity guards cannot prevent stale in-flight cache repopulation without adding unbounded auxiliary state or changing publish response timing.
- Hot reload cannot bypass both version and manifest caches.
- Benchmark memory continues growing after capacity is exceeded.
- Comparable benchmark runs regress consistently by more than 5%.

## Maintenance notes

- Cache keys must always use exact resolved versions and repository-instance ownership; successful publish is an invalidation boundary even for nominally immutable versions.
- Future manifest-derived precomputation may be stored beside the cached manifest only when its invalidation and memory contribution are included in the same bound.
- Reviewers should focus on hidden object mutation and stale `allVersions` behavior; those are the highest-risk failure modes.
