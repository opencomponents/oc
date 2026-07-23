# Plan 001: Improve high-traffic component route performance without long-lived metadata caching

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report; do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 35b22556..HEAD -- packages/oc/src/registry packages/oc-fastify-server-adapter/src/index.ts plans`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding. On a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `35b22556`, 2026-07-23

## Why This Matters

The component route flow is the high-traffic path for OC registries: single component GETs, batch POSTs, and nested component renders all converge through `GetComponentHelper`. The highest-value improvements are the ones that reduce burst amplification, per-request middleware overhead, and repeated hot-path allocations without introducing large long-lived caches. This plan explicitly excludes full component `package.json` metadata caching because that can grow heap with the number of component versions and needs a separate bounded-cache design.

The target trade-off is: less duplicated I/O, VM/template compile work, timer churn, and unbounded concurrency, while keeping steady-state memory flat or lower under load.

## Current State

Relevant files:

| File | Role |
|------|------|
| `packages/oc/src/registry/routes/helpers/get-component.ts` | Main component render helper; loads env/server/template files, executes data providers, renders templates. |
| `packages/oc/src/registry/routes/components.ts` | Batch component POST route. |
| `packages/oc/src/registry/domain/nested-renderer.ts` | Nested `renderComponent` and `renderComponents` implementation exposed to data providers. |
| `packages/oc/src/registry/domain/version-handler.ts` | Resolves requested component versions. |
| `packages/oc/src/registry/domain/validators/plugins-requirements.ts` | Validates component plugin requirements against registry plugins. |
| `packages/oc/src/registry/middleware/index.ts` | Registers global middleware, request timing, body parsing, uploads, CORS, dynamic config helpers. |
| `packages/oc/src/registry/domain/events-handler.ts` | Event subscription and dispatch implementation. |
| `packages/oc/src/registry/domain/http-server/express-adapter.ts` | Default Express adapter. |
| `packages/oc-fastify-server-adapter/src/index.ts` | Fastify adapter. |

Current code facts to preserve:

```ts
// packages/oc/src/registry/routes/helpers/get-component.ts:499-554
const cacheKey = `${component.name}/${component.version}/template.js`;
const cached = cache.get('file-contents', cacheKey);
...
if (cached && !conf.hotReloading) {
  returnResult(cached);
} else {
  fromPromise(repository.getCompiledView)(
    component.name,
    component.version,
    (_err, templateText) => {
      const template = ocTemplate.getCompiledTemplate(templateText, key);
      cache.set('file-contents', cacheKey, template);
      returnResult(template);
    }
  );
}
```

```ts
// packages/oc/src/registry/routes/helpers/get-component.ts:571-747
fromPromise(getEnv)(component, (err, env) => {
  ...
  const cacheKey = `${component.name}/${component.version}/server.js`;
  const cached = cache.get('file-contents', cacheKey);
  const domain = Domain.create();
  ...
  if (cached && !conf.hotReloading) {
    domain.on('error', returnComponent);
    ...
  } else {
    fromPromise(repository.getDataProvider)(
      component.name,
      component.version,
      (err, dataProvider) => {
        ...
        vm.runInNewContext(dataProvider.content, context, options);
        const processData =
          context.module.exports['data'] || context.exports['data'];
        cache.set('file-contents', cacheKey, processData);
        ...
      }
    );
  }
});
```

```ts
// packages/oc/src/registry/routes/components.ts:89-105
async.map(
  components,
  (component, callback) => {
    getComponent(...);
  },
  ...
);
```

```ts
// packages/oc/src/registry/domain/nested-renderer.ts:68-85
return Promise.all(
  components.map((component) => {
    return renderer(...).catch((err) => new Error(err));
  })
);
```

```ts
// packages/oc/src/registry/middleware/index.ts:19-50
adapter.enableRequestTiming((req, res, time) => {
  const data: RequestData = {
    body: req.body,
    duration: time,
    headers: req.headers,
    method: req.method,
    path: req.path,
    relativeUrl: req.originalUrl,
    query: req.query,
    url: req.protocol + '://' + req.get('host') + req.originalUrl,
    statusCode: res.statusCode
  };
  eventsHandler.fire('request', data);
});
...
if (!options.local) {
  adapter.enableFileUploads(...);
}
```

```ts
// packages/oc-fastify-server-adapter/src/index.ts:225-275
this.app.addHook('preHandler', async (request) => {
  const req = request as FastifyRequestWithState;
  if (
    req[multipartParsedSym] ||
    typeof req.isMultipart !== 'function' ||
    !req.isMultipart()
  ) {
    return;
  }
  ...
});
```

```ts
// packages/oc/src/registry/domain/http-server/express-adapter.ts:91-106
enableFileUploads(opts) {
  const upload = multer(...);
  this.app.use(upload.any());
}
```

```ts
// packages/oc/src/registry/routes/helpers/get-component.ts:633-641
const setCallbackTimeout = () => {
  const executionTimeout = conf.executionTimeout;
  if (executionTimeout) {
    setTimeout(() => {
      const message = `timeout (${executionTimeout * 1000}ms)`;
      returnComponent({ message }, undefined);
      domain.exit();
    }, executionTimeout * 1000);
  }
};
```

Repo conventions:

- TypeScript source lives under `packages/*/src` and builds to `dist`.
- `packages/oc` unit tests are mostly CommonJS under `packages/oc/test/unit` and run against built `dist` files through `node tasks/mochaTest.js`.
- `packages/oc-fastify-server-adapter` uses Jest and TypeScript source tests.
- Use existing small helper style. Avoid broad rewrites and avoid changing response shapes.

## Commands You Will Need

Run commands from the repository root unless noted.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build `oc` | `npm --workspace packages/oc run build` | exit 0, lint + TypeScript + build complete |
| Test `oc` | `npm --workspace packages/oc run test-silent` | exit 0, all tests pass |
| Benchmark `oc` | `npm --workspace packages/oc run bench:quick` | exit 0, benchmark completes and prints scenario results |
| Build Fastify adapter | `npm --workspace packages/oc-fastify-server-adapter run build` | exit 0, lint + TypeScript complete |
| Test Fastify adapter | `npm --workspace packages/oc-fastify-server-adapter run test-silent` | exit 0, Jest and integration tests pass |

## Scope

**In scope**:

- `packages/oc/src/registry/routes/helpers/get-component.ts`
- `packages/oc/src/registry/routes/components.ts`
- `packages/oc/src/registry/domain/nested-renderer.ts`
- `packages/oc/src/registry/domain/version-handler.ts`
- `packages/oc/src/registry/domain/validators/plugins-requirements.ts`
- `packages/oc/src/registry/middleware/index.ts`
- `packages/oc/src/registry/domain/events-handler.ts`
- `packages/oc/src/registry/domain/http-server/types.ts`
- `packages/oc/src/registry/domain/http-server/express-adapter.ts`
- `packages/oc-fastify-server-adapter/src/index.ts`
- Relevant tests under `packages/oc/test/unit` and `packages/oc-fastify-server-adapter/test`
- This plan file and `plans/README.md` status updates

**Out of scope**:

- Full component `package.json` metadata caching.
- Registry UI route behavior, HTML view output, and preview/info page changes.
- Response JSON shape changes for component routes.
- Removing Node `Domain` from data-provider execution. That is a larger compatibility-risk refactor.
- Storage adapter implementation changes.

## Git Workflow

- Do not commit, push, or open a PR unless explicitly instructed by the operator.
- If committing is requested later, use a concise conventional-style message like `perf: reduce component route hot-path overhead`.
- Never revert unrelated worktree changes.

## Steps

### Step 1: Add single-flight dedupe for cold template, server, and env loads

In `packages/oc/src/registry/routes/helpers/get-component.ts`, add a small helper local to `getComponent(conf, repository)` that dedupes in-flight async work by cache namespace/key.

Target behavior:

- If `conf.hotReloading` is true, preserve current behavior and do not use the long-lived compiled cache for server/template code.
- For non-hot-reload cache misses, store an in-flight `Promise` keyed by the same logical keys currently used:
  - `${component.name}/${component.version}/template.js`
  - `${component.name}/${component.version}/server.js`
  - `${component.name}/${component.version}/.env`
- Delete the in-flight entry in `finally`, whether the operation resolves or rejects.
- Do not cache rejected results.
- Keep the existing `nice-cache` as the resolved-value cache.

Implementation guidance:

- Prefer one `Map<string, Promise<unknown>>` inside `getComponent(conf, repository)`.
- Wrap `repository.getCompiledView + ocTemplate.getCompiledTemplate` as a shared promise before invoking `returnResult(template)`.
- Wrap `repository.getDataProvider + vm.runInNewContext + processData extraction` as a shared promise that resolves to the `processData` function and caches it only after successful VM execution.
- Wrap `getEnv` similarly, or fold the single-flight logic directly into `getEnv` because it already owns the `.env` cache key.
- Be careful not to move per-request objects such as `contextObj`, `responseHeaders`, `responseCookies`, `params`, or `domain` into shared cached state.

Tests to add or update:

- In `packages/oc/test/unit/registry-routes-helpers-get-component.js`, add a test that invokes the same component twice concurrently on a cold `server.js` cache and asserts `mockedRepository.getDataProvider` is called once.
- Add a similar test for rendered templates asserting `mockedRepository.getCompiledView` is called once for concurrent cold renders.
- If the existing callback-oriented test style makes concurrent assertions awkward, use two callbacks and finish when both have fired.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` -> exit 0.

### Step 2: Bound batch and nested render concurrency

In `packages/oc/src/registry/routes/components.ts`, replace unbounded `async.map` with bounded concurrency while preserving result order.

In `packages/oc/src/registry/domain/nested-renderer.ts`, replace unbounded `Promise.all(components.map(...))` with bounded concurrency while preserving result order.

Implementation guidance:

- Reuse the existing utility `packages/oc/src/utils/pLimit.ts` if it is suitable.
- Use a conservative internal default such as `10` if no existing config field is appropriate.
- Do not add a public configuration option unless necessary; this plan prefers the smallest safe hot-path fix.
- Preserve existing behavior where nested render errors become `new Error(err)` entries rather than rejecting the whole `renderComponents` call.
- Preserve output order exactly.

Tests to add or update:

- Add or update tests in `packages/oc/test/unit/registry-routes-components.js` to assert the batch route still returns results in input order.
- Add or update tests in `packages/oc/test/unit/registry-domain-nested-renderer.js` to assert nested results remain ordered and errors remain result entries.
- If feasible, add a simple concurrency cap test using delayed fake renders and a max-active counter.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` -> exit 0.

### Step 3: Scope multipart upload handling to publish requests

Component GET/POST requests should not pay upload parsing checks. Publish routes are the only routes that need `req.files`.

Implementation approach options:

- Preferred: extend `HttpServerAdapter.route(...)` or add a route-scoped upload handler facility so `router.ts` can attach upload parsing only to the publish route.
- Acceptable smaller first step: add a cheap method/path guard inside adapter upload middleware so it returns before async multipart parsing work for all non-`PUT` requests and non-publish paths.

Files to inspect and update:

- `packages/oc/src/registry/router.ts` publish route registration at the `put ${prefix}:componentName/:componentVersion` route.
- `packages/oc/src/registry/routes/publish.ts`, which consumes `req.files`.
- `packages/oc/src/registry/middleware/index.ts`, which currently enables uploads globally.
- Both adapters: `express-adapter.ts` and `packages/oc-fastify-server-adapter/src/index.ts`.

Preserve behavior:

- Non-local registries still support package upload publishing.
- Publish auth remains before publish logic, as currently registered through `adapter.fromConnect(conf.beforePublish)`.
- Multipart field size behavior and temp-file naming remain unchanged.

Tests to add or update:

- Existing publish tests must still pass.
- Add adapter-level or route-level tests, if existing harnesses make it practical, that a normal component GET does not invoke upload parsing.
- For Fastify, add/adjust tests under `packages/oc-fastify-server-adapter/test` if route-scoped support is added there.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` -> exit 0.

**Verify**: `npm --workspace packages/oc-fastify-server-adapter run build` -> exit 0 if Fastify adapter changed.

**Verify**: `npm --workspace packages/oc-fastify-server-adapter run test-silent` -> exit 0 if Fastify adapter changed.

### Step 4: Gate request timing and event payload work when there are no listeners

Currently request timing is enabled unconditionally and `middleware/index.ts` builds a `RequestData` object before `eventsHandler.fire('request', data)` can discover whether subscribers exist.

Implementation guidance:

- Add `hasListeners(eventName)` to `packages/oc/src/registry/domain/events-handler.ts` and its TypeScript type.
- Optionally add `fireLazy(eventName, factory)` if that keeps call sites cleaner.
- In `middleware/index.ts`, avoid constructing `RequestData` when there are no `request` listeners.
- If the adapter API can accept a timing predicate without becoming complex, skip the timing hooks entirely when no request listener exists. If listener registration can happen after startup and that would break semantics, keep hooks enabled but skip payload construction.
- Do not change `registry.on(...)` public behavior.

Tests to add or update:

- Add an `events-handler` unit test for `hasListeners` through `on`, `off`, and `reset`.
- Add or update middleware tests if present; otherwise unit-test the helper behavior enough to protect event semantics.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` -> exit 0.

### Step 5: Clear execution timeout timers after provider completion

In `get-component.ts`, `setCallbackTimeout` currently creates a timer per data-provider request when `conf.executionTimeout` is configured, but successful completions do not clear it.

Implementation guidance:

- Store the timeout handle in the render invocation scope.
- Clear it inside the first successful or error path in `returnComponent`, before or immediately after setting `componentCallbackDone`.
- Keep the duplicate-callback guard.
- Do not change timeout semantics: if the timer wins, it should still call `returnComponent({ message }, undefined)` and exit the domain as it does today.

Tests to add or update:

- Add a fake-timer test if the test stack already supports it through Sinon.
- Assert that a successful provider completion clears the timeout.
- Assert that the timeout path still returns an error when the provider never calls back.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` -> exit 0.

### Step 6: Fast-path common version resolution

In `packages/oc/src/registry/domain/version-handler.ts`, avoid semver range work for the common cases.

Target behavior:

- Empty or undefined requested version returns the latest version.
- Exact requested version that exists returns immediately.
- Existing range semantics remain unchanged for real semver ranges.

Implementation guidance:

- Available versions are sorted in `components-list.ts`, so latest can be the last entry when the list is non-empty.
- Use `availableVersions.includes(requestedVersion)` for exact hits before `semver.maxSatisfying`.
- Keep fallback behavior compatible for unusual version strings.

Tests to add or update:

- Update `packages/oc/test/unit/registry-domain-version-handler.js` or equivalent.
- Cover undefined, empty string, exact existing version, range version, and missing exact version.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` -> exit 0.

### Step 7: Hoist stable hot-path checks and avoid needless response header objects

In `get-component.ts` and `plugins-requirements.ts`, remove repeated stable work from each render.

Implementation guidance:

- Build `customHeadersToSkipOnWeakVersion` as a `Set` once when `GetComponentHelper(conf, repository)` is created, not inside every render.
- Precompute registry plugin names once. Either change `plugins-requirements.ts` to accept a `Set` or add a local helper in `get-component.ts`. Keep the public validator behavior compatible if it is imported elsewhere.
- Cache plugin compatibility and template min OC validation per component version only if the cache is bounded by existing component/template cache lifecycle, or if it stores tiny boolean/result objects keyed by component version. Do not cache full package metadata.
- Keep `responseHeaders` undefined until `contextObj.setHeader` is called.
- Only include `headers` in `GetComponentResult` when headers exist.
- Preserve response shape except omitting empty `headers` internal property; external JSON responses should not gain or lose documented fields.

Tests to add or update:

- Existing custom header tests should still pass.
- Add or update tests for a component that does not call `setHeader`, asserting the route does not attempt to set empty headers if there is a convenient spy.
- Add plugin requirement validation tests if changing validator inputs.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` -> exit 0.

### Step 8: Lazy parse headers used by only some components or negotiation paths

In `get-component.ts`, reduce per-render parsing/allocation for headers that are not always needed.

Implementation guidance:

- Move `parseTemplatesHeader(...)` inside the `isUnrendered && isValidClientRequest && options.headers['templates']` branch.
- Replace `options.headers['user-agent'].match('oc-client-')` with `String(...).includes('oc-client-')` or equivalent.
- Make `contextObj.acceptLanguage` a lazy getter that memoizes `acceptLanguageParser.parse(rawValue)` on first access.
- Preserve support for `__ocAcceptLanguage` parameter override.
- Ensure `contextObj` still behaves like an object for component data providers.

Tests to add or update:

- Existing unrendered negotiation tests in `registry-routes-helpers-get-component.js` must still pass.
- Add a test, if practical with injection/spies, that rendered requests with a `templates` header do not call `parseTemplatesHeader` or equivalent parsing code.
- Add/keep a test proving `acceptLanguage` is available when a component reads it.

**Verify**: `npm --workspace packages/oc run build` -> exit 0.

**Verify**: `npm --workspace packages/oc run test-silent` -> exit 0.

### Step 9: Benchmark and compare

After all functional tests pass, run the quick benchmark.

**Verify**: `npm --workspace packages/oc run bench:quick` -> exit 0.

Expected result:

- Benchmark completes without failures.
- RPS should be neutral or better.
- P95 latency should be neutral or better, especially on high-concurrency or storage-backed scenarios.
- Heap/RSS should be neutral or lower under bursty scenarios because single-flight and bounded fan-out reduce duplicate work.

If benchmark numbers are noisy, do not overfit. Record the before/after output in the implementation notes or PR description if one is created.

## Test Plan

Required tests:

- Concurrent cold `server.js` load dedupes to one `getDataProvider` call.
- Concurrent cold template load dedupes to one `getCompiledView` call.
- Batch route preserves response order under concurrency limiting.
- Nested `renderComponents` preserves response order and error-as-result behavior.
- Publish upload flow still works.
- Request event listener behavior is unchanged, including `on`, `off`, and `reset`.
- Execution timeout timer is cleared after successful provider completion and still fires for hung providers.
- Version handler covers latest, exact, range, and missing versions.
- Unrendered template negotiation behavior remains unchanged.

Verification commands:

- `npm --workspace packages/oc run build` -> exit 0.
- `npm --workspace packages/oc run test-silent` -> exit 0.
- `npm --workspace packages/oc-fastify-server-adapter run build` -> exit 0 if Fastify adapter changed.
- `npm --workspace packages/oc-fastify-server-adapter run test-silent` -> exit 0 if Fastify adapter changed.
- `npm --workspace packages/oc run bench:quick` -> exit 0.

## Done Criteria

All must hold:

- [ ] No full component `package.json` metadata cache was added.
- [ ] Single-flight entries are deleted after resolve or reject and do not cache failures.
- [ ] Batch and nested render result ordering is preserved.
- [ ] Component route response JSON shape is unchanged.
- [ ] Publish upload behavior still works for non-local registries.
- [ ] `registry.on(...)`, `off`, and `reset` event behavior remains compatible.
- [ ] Execution timeout behavior is preserved and successful provider calls clear their timer.
- [ ] `npm --workspace packages/oc run build` exits 0.
- [ ] `npm --workspace packages/oc run test-silent` exits 0.
- [ ] `npm --workspace packages/oc run bench:quick` exits 0.
- [ ] Fastify adapter build/tests pass if `packages/oc-fastify-server-adapter/src/index.ts` changed.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

Stop and report back if:

- The current code no longer matches the excerpts above after the drift check.
- Upload parsing cannot be scoped or cheaply guarded without changing publish auth/order semantics.
- Single-flight dedupe requires sharing per-request state such as `contextObj`, `domain`, `params`, headers, cookies, or response objects.
- Concurrency limiting would require a public config option or response contract change.
- Event timing gating would break dynamic listener registration semantics.
- Benchmarks show a consistent regression larger than normal noise after two runs.
- A verification command fails twice after reasonable fix attempts.

## Maintenance Notes

- Single-flight dedupe is intentionally not a long-lived metadata cache. It should only collapse concurrent misses and then hand off to the existing resolved-value cache.
- If future work adds full component metadata caching, it should be a separate bounded LRU/TTL design with heap measurements.
- Reviewers should scrutinize request-specific state capture in the single-flight implementation. Accidentally sharing request context across requests would be a correctness bug.
- Reviewers should scrutinize upload scoping because publish route behavior is externally visible.
- If registries rely heavily on very large batch requests, tune the internal concurrency limit based on benchmark data rather than increasing it blindly.
