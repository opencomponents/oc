# Plan 007: Compile component parameter schemas and add an empty-schema fast lane

> **Executor instructions**: Implement this plan as one parameter-pipeline PR after the manifest and synchronous-render work. Preserve defaults, coercion, validation errors, enum behavior, reserved-parameter removal, and parameter-object identity semantics with characterization tests. Update `plans/README.md` when complete unless a reviewer owns it.
>
> **Drift check (run first)**: `git diff --stat 0564f540..HEAD -- packages/oc/src/registry/routes/helpers/component-parameter-processor.ts packages/oc/src/registry/routes/helpers/get-component.ts packages/oc/src/registry/routes/helpers/apply-default-values.ts packages/oc/src/registry/domain/sanitiser.ts packages/oc/src/registry/domain/validators/component-parameters.ts packages/oc/test/unit plans/README.md`
> Plans 005–006 are expected to change manifest identity and render orchestration. Stop if the three-stage parameter pipeline described below no longer exists.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/006-synchronous-render-hot-lane.md`
- **Category**: perf
- **Planned at**: commit `0564f540`, 2026-08-17

## Why this matters

Every render reinterprets immutable component-version parameter metadata. Defaulting builds and filters entries, sanitization scans request parameters into a new object, and validation rebuilds mandatory-name arrays and error maps before scanning parameters again. Compiling the static schema once and fusing request-time work removes repeated allocations, while a dedicated empty-schema lane avoids validation machinery for components that declare no parameters.

## Current state

The hot path in `packages/oc/src/registry/routes/helpers/get-component.ts:300-312` always runs three stages:

```ts
const appliedParams = applyDefaultValues(
  requestedComponent.parameters,
  component.oc.parameters
);
const params = sanitiser.sanitiseComponentParameters(
  appliedParams,
  component.oc.parameters
);
const validationResult = validator.validateComponentParameters(
  params,
  component.oc.parameters
);
```

- `routes/helpers/apply-default-values.ts:12-27` runs `Object.entries(...).filter(...)` for defaults on every render and mutates the supplied request object when applying them.
- `domain/sanitiser.ts:43-60` enumerates request parameters and allocates a result object, preserving undeclared parameters except `__ocAcceptLanguage`.
- `domain/validators/component-parameters.ts:35-79` allocates error structures, rebuilds mandatory names, and scans request parameters.
- `component-parameters.ts:81-107` repeatedly calls `Object.keys`, maps/joins key arrays, and builds the final message even for valid requests.
- After Plan 005, a non-hot-reload component version should reuse a stable manifest/schema object. A `WeakMap` keyed by schema identity can memoize compilation without keeping evicted manifests alive.

## Commands you will need

Run from repository root.

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm --workspace packages/oc run build` | exit 0 |
| Tests | `npm --workspace packages/oc run test-silent` | exit 0 |
| Capture quick baseline | `npm --workspace packages/oc run bench:quick -- --result-file=/tmp/oc-plan007-quick-before.json` | exit 0 before source edits |
| Capture batch baseline | `npm --workspace packages/oc run bench -- --scenarios=batch-storage --repetitions=3 --result-file=/tmp/oc-plan007-batch-before.json` | exit 0 before source edits |
| Compare quick | `npm --workspace packages/oc run bench:quick -- --baseline-file=/tmp/oc-plan007-quick-before.json --max-rps-regression-percent=5 --max-p95-regression-percent=5 --expect-success-rate=1` | exit 0 after source edits |
| Compare batch | `npm --workspace packages/oc run bench -- --scenarios=batch-storage --repetitions=3 --baseline-file=/tmp/oc-plan007-batch-before.json --max-rps-regression-percent=5 --max-p95-regression-percent=5 --expect-package-reads=0,0,0 --expect-success-rate=1` | exit 0 after source edits |

## Scope

**In scope**:

- New `packages/oc/src/registry/routes/helpers/component-parameter-processor.ts`
- New focused unit test under `packages/oc/test/unit`
- `packages/oc/src/registry/routes/helpers/get-component.ts`
- Existing parameter helper/validator files only when needed to preserve public imports through delegation
- Existing tests for defaults, sanitization, and validation
- `plans/README.md` status update

**Out of scope**:

- Changing documented parameter coercion or validation behavior.
- Returning the input request object directly if current tests establish a distinct sanitized object.
- Caching compiled schemas in a module-global or unbounded strong-reference map.
- Changing component manifests or cache capacity.
- Rewriting unrelated validators.
- Removing compatibility exports used by existing tests/callers.

## Git workflow

- Branch: `advisor/007-compiled-parameter-schema`
- Suggested commit: `perf(registry): compile component parameter schemas`
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 0: Capture same-machine baselines

After building the completed Plan 006 tree and before changing source, run both Capture baseline commands. Keep the exact `/tmp/oc-plan007-*-before.json` files unchanged through Step 6. If Plan 003 reports environment/workload drift, recapture both sides from clean commits on the same machine instead of bypassing the checker.

**Verify**: both baseline files exist, include the expected scenarios/repetitions, and every run succeeded.

### Step 1: Add parameter-pipeline characterization tests

Before changing production code, create a table-driven test suite covering the combined current behavior of defaulting, sanitization, and validation.

Include:

- empty/undefined schema with no request parameters;
- empty schema with ordinary undeclared parameters;
- removal of `__ocAcceptLanguage` from provider params while it remains available to language selection;
- optional defaults for string, number, boolean, false, zero, and empty string;
- explicit request values overriding defaults;
- missing mandatory parameters and exact error text/order;
- string/number/boolean coercion as currently implemented;
- invalid type and invalid enum values;
- multiple missing/invalid parameters and exact joined message;
- action requests, which currently continue despite validation failure at the route decision point;
- whether applying defaults mutates the original request-parameter object;
- whether sanitized params are a distinct object.

Use existing fixtures/tests as the source of expected values; do not “correct” surprising behavior in a performance PR.

**Verify**: new characterization tests pass before refactoring.

### Step 2: Implement schema compilation

Create `component-parameter-processor.ts` with two phases:

```ts
compileParameterSchema(expectedParameters): CompiledParameterSchema
processParameters(requestParameters, compiled): {
  params: Record<string, string | number | boolean>;
  validation: ValidationResult;
}
```

The compiled representation must contain only config-derived immutable data:

- ordered default entries;
- ordered mandatory names;
- parameter type descriptors;
- enum references/sets only when they preserve current equality semantics;
- a boolean empty-schema capability flag.

Normalize type names during compilation rather than per request. Preserve declaration/insertion order where it affects error messages.

Do not capture request data in the compiled object.

**Verify**: focused processor tests pass.

### Step 3: Fuse request-time processing

Implement `processParameters` so it:

1. applies defaults with the same mutation behavior characterized in Step 1;
2. scans request parameters once to build sanitized params, remove the reserved language override, coerce declared values, and record type/enum failures;
3. checks compiled mandatory names without rebuilding them;
4. constructs error maps/message only when an error exists;
5. returns the exact validation shape expected by `get-component.ts`.

For an empty schema:

- skip defaults, mandatory, type, enum, and error-map construction where observable output permits;
- preserve undeclared ordinary parameters;
- remove `__ocAcceptLanguage`;
- preserve the characterized output-object identity behavior.

Avoid array callback chains in the request-time function. Favor one explicit loop and lazy error-object allocation, but do not alter error ordering.

**Verify**: characterization suite passes against the new processor.

### Step 4: Cache compiled schemas by identity

Inside the registry-scoped render service/helper, create a `WeakMap<object, CompiledParameterSchema>`.

- Key by `component.oc.parameters` identity when it is an object.
- Use a shared compiled empty-schema singleton for missing/empty schemas.
- Compile on first use and reuse thereafter.
- Hot reload naturally recompiles when a new manifest/schema object is loaded.
- Weak keys ensure Plan 005 manifest eviction permits schema collection.
- Do not key by component name/version in another unbounded map.

Replace the three hot-path calls in `get-component.ts` with the compiled processor. Keep legacy exported helpers/validators unchanged or delegate through the new implementation if external/internal tests import them directly.

**Verify**: build and full tests → exit 0.

### Step 5: Prove compilation and fast-lane behavior

Add instrumentation-friendly tests asserting:

- the same schema object compiles once across repeated renders;
- two schema identities compile independently;
- empty/missing schemas use the shared fast lane;
- no request object is retained in compiled state;
- a hot-reloaded schema identity produces new defaults/validation immediately;
- output and error objects are not shared between requests when callers can mutate them.

Do not assert garbage collection behavior directly; the WeakMap ownership structure is the proof.

**Verify**: full tests → exit 0.

### Step 6: Benchmark

Run both Compare commands after a clean build.

Machine gates:

- every run success rate exactly 1;
- batch package reads remain `0,0,0` after preflight;
- response/work-count parity tests remain green;
- Plan 003 rejects RPS or p95 regression above 5% against either compatible captured baseline;
- no long-lived strong-reference schema cache was introduced.

Report CPU and heap direction, especially for the 20-item batch, without making noisy memory samples a cross-machine gate. If performance is neutral but allocation structure is simpler and all gates pass, report that honestly; do not add primitive micro-optimizations.

## Test plan

- Table-driven parity across defaults, coercion, mandatory/type/enum errors, actions, and reserved parameters.
- Identity tests for request inputs/outputs and per-request error structures.
- Compilation-count tests for stable, changed, and empty schemas.
- Existing helper/validator tests remain green for compatibility imports.
- Batch benchmark validates cumulative behavior.

## Done criteria

- [ ] Static defaults/mandatory/type/enum metadata compiles once per schema identity.
- [ ] Request-time processing uses one primary parameter scan.
- [ ] Empty schemas bypass validation machinery while preserving output behavior.
- [ ] No unbounded strong-reference cache was added.
- [ ] Hot reload observes schema changes.
- [ ] Exact error shapes, messages, ordering, coercion, and reserved-parameter behavior are unchanged.
- [ ] Request/output mutation and identity semantics match characterization tests.
- [ ] Build/tests pass and both Plan 003 same-machine 5% comparison gates succeed.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- Existing callers rely on behavior not representable by immutable compiled schema data.
- Component parameter schemas are mutated in place after manifest load under non-hot-reload operation.
- Error ordering depends on dynamic object enumeration that compilation changes.
- Compatibility requires a module-global strong-reference cache.
- The fused path changes any characterized output or callback behavior.
- Comparable benchmarks regress consistently by more than 5%.

## Maintenance notes

- Any future parameter feature must update compilation and parity tables together.
- Keep compiled state tied to manifest/schema reachability so Plan 005's cache bound remains meaningful.
- Do not optimize primitive coercion until profiles show it matters after eliminating repeated schema scans.
