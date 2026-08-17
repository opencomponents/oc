# Plan 004: Replace `nice-cache` with a bounded registry-scoped artifact cache

> **Executor instructions**: Implement this plan as one infrastructure PR. Follow the steps exactly and stop on any condition below. Use the established `lru-cache` package for eviction rather than maintaining a custom LRU implementation. Update `plans/README.md` when complete unless a reviewer maintains the index.
>
> **Drift check (run first)**: `git diff --stat 0564f540..HEAD -- packages/oc/src/utils/bounded-cache.ts packages/oc/src/registry/routes/helpers/get-component.ts packages/oc/src/registry/routes/component.ts packages/oc/src/registry/routes/components.ts packages/oc/src/registry/router.ts packages/oc/test/unit packages/oc/package.json package-lock.json plans/README.md`
> Compare changed in-scope files with the excerpts below. If Plan 003 has landed, its `packages/oc/package.json` benchmark-script addition and `plans/README.md` status change are expected; other in-scope drift is not.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/003-manifest-work-parity-benchmarks.md`
- **Category**: perf
- **Planned at**: commit `0564f540`, 2026-08-17

## Why this matters

`nice-cache` is a process-wide singleton with no bounded eviction. Artifact entries therefore outlive individual registry instances, can collide when multiple registries serve the same component/version from different stores, and grow with every rendered version. This PR replaces it with a small namespaced wrapper around the established `lru-cache` package, owned by one render service, and shares that service across GET and batch routes, preserving existing caching and single-flight behavior without global state.

## Current state

- `packages/oc/src/registry/routes/helpers/get-component.ts:137-165` constructs `nice-cache`, plugin conversion state, and a helper-local `inFlight` map.

```ts
const client = Client({ templates: conf.templates });
const cache = new Cache({
  verbose: !!conf.verbosity,
  refreshInterval: conf.refreshInterval
});
...
const inFlight = new Map<string, Promise<unknown>>();
```

- The helper caches three artifact types under `file-contents`:
  - env: `get-component.ts:183-194`;
  - compiled templates: `get-component.ts:541-599`;
  - compiled data providers: `get-component.ts:640-802`.
- `packages/oc/src/registry/router.ts:33-36` independently constructs component and batch routes.
- `packages/oc/src/registry/routes/component.ts:14` and `routes/components.ts:25` each call `GetComponentHelper(conf, repository)`.
- The installed `nice-cache` defaults to singleton mode and stores values in an unbounded object; `refreshInterval` refreshes only subscribed entries, while this code only uses `get`/`set`.
- Existing Plan 001 added artifact single-flight and Plan 002 measured it. Preserve those wins.

Repository conventions:

- Put reusable internal TypeScript utilities under `packages/oc/src/utils` or a narrowly named registry domain module.
- Unit tests are CommonJS under `packages/oc/test/unit` and import built `dist` output.
- Avoid changing public HTTP response shapes and public registry configuration in this PR.

## Commands you will need

Run from repository root.

| Purpose | Command | Expected on success |
|---|---|---|
| Replace dependency | `npm uninstall nice-cache --workspace packages/oc && npm install lru-cache@10.4.3 --workspace packages/oc` | exit 0; manifest and lockfile updated |
| Build | `npm --workspace packages/oc run build` | exit 0 |
| Tests | `npm --workspace packages/oc run test-silent` | exit 0 |
| Burst | `npm --workspace packages/oc run bench:burst` | exit 0; artifact calls remain one each |
| Capture baseline | `npm --workspace packages/oc run bench:quick -- --result-file=/tmp/oc-plan004-before.json` | exit 0 before source edits |
| Compare benchmark | `npm --workspace packages/oc run bench:quick -- --baseline-file=/tmp/oc-plan004-before.json --max-rps-regression-percent=5 --max-p95-regression-percent=5 --expect-success-rate=1` | exit 0 after source edits |

## Scope

**In scope**:

- New `packages/oc/src/utils/bounded-cache.ts`
- New focused unit test under `packages/oc/test/unit`
- `packages/oc/src/registry/routes/helpers/get-component.ts`
- `packages/oc/src/registry/routes/component.ts`
- `packages/oc/src/registry/routes/components.ts`
- `packages/oc/src/registry/router.ts`
- Related route/helper unit tests
- `packages/oc/package.json`
- root `package-lock.json`
- `plans/README.md` status update

**Out of scope**:

- Caching component `package.json` manifests; that is Plan 005.
- Public cache-size configuration.
- Changing hot-reload semantics.
- Sharing request state such as parameters, domains, headers, cookies, response objects, or provider contexts.
- Adding cache packages other than `lru-cache`.

## Git workflow

- Branch: `advisor/004-registry-artifact-cache`
- Suggested commit: `perf(registry): scope and bound render artifact caching`
- Do not push or open a PR unless explicitly instructed.
- Do not modify the optimization playbook.

## Steps

### Step 0: Capture the same-machine baseline

After building Plan 003 and before changing production source, run the Capture baseline command from the command table. Keep `/tmp/oc-plan004-before.json` unchanged until final verification. If environment/workload compatibility later fails, recapture before and after from clean commits on the same machine rather than bypassing the checker.

**Verify**: the exact baseline file exists and contains all `bench:quick` scenarios.

### Step 1: Add a bounded LRU utility

Create `packages/oc/src/utils/bounded-cache.ts` as a compact namespaced wrapper around `lru-cache@10.4.3`. Keep the dependency on v10 so the package remains compatible with the registry's Node 18 minimum.

Required API:

```ts
export default class BoundedCache {
  constructor(maxEntries: number);
  get<T>(namespace: string, key: string): T | undefined;
  set<T>(namespace: string, key: string, value: T): void;
  delete(namespace: string, key: string): boolean;
  clear(): void;
  get size(): number;
}
```

Required behavior:

- Reject non-positive or non-integer capacity.
- Compose namespace and key without collision; a nested `Map` or an unambiguous composite key is acceptable.
- `get` promotes a hit to most-recently used.
- Updating an existing key does not grow size.
- `delete` removes exactly one namespaced key, returns whether it existed, and leaves other namespaces untouched.
- Inserting over capacity evicts exactly the least-recently used entry.
- Cache `false`, `0`, empty strings, and empty objects correctly; only `undefined` is a miss.
- No timers, module-global singleton, or hidden process-wide state.

Use an internal constant of **1000 total artifact entries per registry render service** when instantiated in production. Keep capacity injectable in tests. Do not add a public config field in this PR.

Add tests covering capacity 1/2, promotion, update, delete, namespaces, falsy values, clear, and independent instances.

**Verify**: build and tests → exit 0.

### Step 2: Replace `nice-cache` in the render helper

In `get-component.ts`:

- remove the `nice-cache` import;
- instantiate `BoundedCache(1000)` once per `GetComponentHelper`;
- keep the existing namespaces and logical keys so behavior is easy to compare;
- use `cached !== undefined`, not truthiness, for hits;
- keep failed loads out of the cache;
- retain `singleFlight(...).finally(delete)` behavior;
- preserve the bypass of compiled template/provider caching when `conf.hotReloading` is true;
- preserve current `.env` behavior exactly in this PR.

Do not put request-specific values in the bounded cache.

**Verify**: `npm --workspace packages/oc run test-silent` → exit 0.

### Step 3: Construct one render service per registry

Change router construction so one `GetComponentHelper(conf, repository)` instance is created in `router.create` and injected into both the single-component and batch route factories.

Target ownership:

```ts
const renderComponent = GetComponentHelper(conf, repository);
const routes = {
  component: ComponentRoute(conf, repository, renderComponent),
  components: ComponentsRoute(conf, repository, renderComponent),
  ...
};
```

Use the existing `RendererOptions` and `GetComponentResult` types for the injected function. Route factories may keep an optional default only if unit-test setup requires it; production router wiring must always pass the shared instance.

This must share:

- bounded artifact cache;
- compiled template/provider values;
- env values;
- plugin conversion setup;
- single-flight state.

It must not share per-render state created inside the renderer invocation.

Add a mixed-route concurrency test that starts a cold GET render and batch render for the same component through the same router-owned helper and proves one provider/template load. If full router testing is impractical, test both route factories with one explicitly shared helper.

**Verify**: build and tests → exit 0.

### Step 4: Prove registry isolation and bounded memory behavior

Add focused tests that instantiate two helpers/caches with the same component/version key but different repository return values.

Assert:

- one registry never receives another registry's compiled provider, template, or env;
- filling one cache does not change the other cache's size;
- after 1001 distinct artifact keys, size is 1000 and the true LRU entry is gone;
- concurrent GET/batch cold loads within one registry still coalesce;
- a rejected single-flight operation is removed and a retry executes again.

**Verify**: `npm --workspace packages/oc run test-silent` → exit 0.

### Step 5: Replace the direct dependency and benchmark

Run the workspace dependency replacement command. Confirm `packages/oc/package.json` no longer lists `nice-cache` and directly lists `lru-cache@^10.4.3`. `nice-cache` may remain transitively in the lockfile for other packages; do not force-remove transitive consumers.

Run burst and the Compare benchmark command. Plan 003's checker must enforce the 5% RPS/p95 thresholds against `/tmp/oc-plan004-before.json`; env/provider/template cold loads must remain one each. Do not tune capacity to the benchmark fixture to force a pass.

**Verify**: all post-change commands in the command table → exit 0.

## Test plan

- Unit-test the LRU independently before integrating it.
- Preserve current helper cache-hit, cold-load, rejection, and hot-reload tests.
- Add mixed GET/batch cold single-flight coverage.
- Add two-registry isolation coverage using identical logical keys and different values.
- Assert bounded size and real LRU promotion.
- Run burst work-count assertions after dependency replacement.

## Done criteria

- [ ] No direct `nice-cache` import or dependency remains in `packages/oc`; `lru-cache@^10.4.3` provides bounded eviction.
- [ ] Artifact cache is bounded to 1000 entries per render service and supports exact namespaced invalidation.
- [ ] Separate registry instances cannot share cached artifacts.
- [ ] GET and batch routes use one render helper per registry.
- [ ] Existing single-flight behavior remains one load per cold artifact key.
- [ ] Hot reload behavior is unchanged.
- [ ] No manifest cache was introduced.
- [ ] Build, tests, burst work assertions, and Plan 003's 5% same-machine comparison gate succeed.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- Tests reveal code intentionally depends on cross-registry cache sharing.
- A cache key requires request-specific dimensions not represented today.
- Sharing the helper requires sharing mutable request state.
- Removing `nice-cache` changes behavior outside `packages/oc` because of lockfile/package-manager resolution.
- Burst work counts regress from one artifact load to N.
- Two comparable benchmark runs show a consistent regression above 5%.

## Maintenance notes

- Capacity 1000 is intentionally internal and conservative. Expose configuration only with production evidence and a separate API decision.
- Plan 005 reuses this utility for manifests but should use its own cache instance/namespace and immutability rules.
- Review every future cache entry for boundedness, registry ownership, complete keys, and mutability before adding it.
