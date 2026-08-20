# Plan 009: Prefilter existing metadata rows before reconciliation inserts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report—do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer owns the index.
>
> **Drift check (run first)**: `git diff --stat 3d45a17a..HEAD -- packages/oc/src/registry/domain/metadata-migration.ts packages/oc/test/unit/registry-domain-metadata-migration.js packages/oc/test/unit/cli-facade-registry-migrate-metadata.js plans/README.md`
> If any in-scope source or test file changed since this plan was written,
> compare the current-state excerpts below with the live code before
> proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW/MED
- **Depends on**: `plans/003-manifest-work-parity-benchmarks.md` for measured startup work; independent of Plan 008's storage scheduling change
- **Category**: perf
- **Planned at**: commit `3d45a17a`, 2026-08-20

## Why this matters

Startup reconciliation currently reads every storage manifest and then calls
`metadataStore.addVersion()` for every discovered row, including rows that are
already present in the metadata table. With Azure Table Storage, an existing
row causes a create conflict followed by an existence lookup; at registry size
this adds roughly one or more metadata requests per already-migrated version.

The first optimization should preserve the existing full storage scan—those
manifest reads already occur in the legacy registry path—but fetch the existing
metadata keys once and submit only missing rows to `addVersion()`. For a
registry with one million existing versions and 100 new versions, this changes
metadata insert attempts from approximately one million to approximately 100.
It does **not** make storage enumeration or cold metadata-cache hydration
incremental; those are explicitly deferred follow-ups.

## Current state

The repository is a TypeScript monorepo using npm workspaces and Turborepo.
The `packages/oc` package builds with TypeScript and runs CommonJS Mocha tests
from `dist`.

Relevant code:

- `packages/oc/src/registry/domain/metadata-migration.ts` — converts storage
  rows into metadata rows and backfills them.
- `packages/oc/src/cli/facade/registry-migrate-metadata.ts` — one-time CLI
  migration; it calls the same backfill helper after reading the legacy details
  projection or scanning storage directories.
- `packages/oc/src/registry/domain/repository.ts` — startup path; when
  `reconcileFromStorage` is true it calls the storage-directory backfill before
  cache hydration.
- `packages/oc/test/unit/registry-domain-metadata-migration.js` — unit tests for
  row conversion, bounded backfill, storage scanning, and legacy export.
- `packages/oc/test/unit/cli-facade-registry-migrate-metadata.js` — CLI facade
  tests with minimal metadata-store and storage mocks.

The current backfill unconditionally schedules every input row:

```ts
// packages/oc/src/registry/domain/metadata-migration.ts:61-92
export const backfillMetadataRows = async (
  metadataStore: MetadataStore,
  rows: ComponentRow[]
): Promise<MetadataMigrationResult> => {
  const result: MetadataMigrationResult = {
    scanned: rows.length,
    inserted: 0,
    skipped: 0
  };
  const limit = pLimit(10);

  await Promise.all(
    rows.map((row) =>
      limit(async () => {
        try {
          await metadataStore.addVersion(row);
          result.inserted += 1;
        } catch (err: any) {
          if (
            err?.code === VERSION_ALREADY_EXISTS ||
            err?.code === VERSION_PUBLISH_IN_PROGRESS
          ) {
            result.skipped += 1;
          } else {
            throw err;
          }
        }
      })
    )
  );

  return result;
};
```

The shared metadata contract already requires a full-row read operation:

```ts
// packages/oc-metadata-adapters-utils/src/index.ts:15-20
export interface MetadataStore {
  adapterType: string;
  isValid(): boolean;
  initialise(): Promise<void>;
  getAllComponents(): Promise<ComponentRow[]>;
  addVersion(row: ComponentRow): Promise<void>;
```

Storage reconciliation builds all candidate rows before invoking the backfill:

```ts
// packages/oc/src/registry/domain/metadata-migration.ts:163-171
export const backfillMetadataFromStorageDirectories = async (options: {
  metadataStore: MetadataStore;
  cdn: StorageAdapter;
  componentsDir: string;
}): Promise<MetadataMigrationResult> =>
  backfillMetadataRows(
    options.metadataStore,
    await getComponentRowsFromStorageDirectories(options)
  );
```

The existing duplicate/error behavior must remain as the race-safe fallback:
`addVersion()` can still encounter a row inserted by another registry after the
prefetch. `VERSION_ALREADY_EXISTS` and `VERSION_PUBLISH_IN_PROGRESS` must still
count as skipped; every other error must still reject the migration.

The Azure Table adapter maps component name and version to the unique
`PartitionKey`/`RowKey` pair and maps an existing entity conflict to the shared
`VERSION_ALREADY_EXISTS` or `VERSION_PUBLISH_IN_PROGRESS` codes. Its
`getAllComponents()` returns committed metadata rows. Do not treat the prefetch
as proof that no concurrent reservation exists.

## Commands you will need

Run from the repository root:

| Purpose | Command | Expected on success |
|---|---|---|
| Build and typecheck | `npm --workspace packages/oc run build` | exit 0; lint and both TypeScript compilations pass |
| Focused migration tests | `npx mocha --timeout 20000 packages/oc/test/unit/registry-domain-metadata-migration.js packages/oc/test/unit/cli-facade-registry-migrate-metadata.js` | exit 0; all focused tests pass |
| Full package tests | `npm --workspace packages/oc run test-silent` | exit 0 |
| Full repository tests | `npm run test-silent` | exit 0 |

The package test files require compiled `packages/oc/dist`; run the build before
invoking the focused Mocha command when `dist` is stale or missing.

## Scope

**In scope** (the only source/test files to modify):

- `packages/oc/src/registry/domain/metadata-migration.ts`
- `packages/oc/test/unit/registry-domain-metadata-migration.js`
- `packages/oc/test/unit/cli-facade-registry-migrate-metadata.js`
- `plans/README.md` status/index update

**Out of scope** (do not touch):

- `packages/oc/src/registry/domain/metadata-index.ts` — cold cache hydration
  remains a separate optimization.
- `packages/oc/src/registry/domain/repository.ts` — startup ordering and
  readiness semantics do not change in this plan.
- Any storage adapter package or the `StorageAdapter` interface — this plan
  intentionally keeps the existing full storage scan.
- Any metadata adapter implementation — `getAllComponents()` is already part
  of the shared contract.
- `components.json`/`components-details.json` export behavior.
- Plan 008's concurrency scheduler or `cdn.maxConcurrentRequests` semantics.
- Public configuration names or migration result field names.

## Git workflow

- Branch: `advisor/009-prefilter-metadata-reconciliation`
- Suggested commit: `perf(registry): skip existing metadata reconciliation inserts`
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 1: Add a collision-safe metadata row key and prefilter

In `packages/oc/src/registry/domain/metadata-migration.ts`, add a private
helper that derives a stable key from exactly `[row.name, row.version]`, using a
collision-safe representation such as `JSON.stringify([name, version])`. Do not
use a simple delimiter concatenation because component names or versions could
make delimiter-based keys ambiguous.

Update `backfillMetadataRows()` as follows:

1. Initialize the result exactly as today, with `scanned: rows.length`.
2. If `rows` is empty, return immediately without calling
   `metadataStore.getAllComponents()` or `metadataStore.addVersion()`.
3. Call `metadataStore.getAllComponents()` once for the non-empty input and
   build a `Set` of existing `[name, version]` keys. Do not retain the full
   existing-row array after the set is built.
4. Filter the input rows to `pendingRows` whose keys are absent from the set.
5. Initialize `result.skipped` to the number of rows removed by this prefilter.
   These rows are already migrated and should be reflected in the existing CLI
   summary rather than silently disappearing.
6. Run the existing bounded `pLimit(10)` add loop only over `pendingRows`.
7. Preserve the current catch behavior for a race after the prefetch:
   `VERSION_ALREADY_EXISTS` and `VERSION_PUBLISH_IN_PROGRESS` increment
   `skipped`; all other errors are rethrown.
8. Preserve `scanned` as the number of source rows, `inserted` as the number of
   successful `addVersion()` calls, and the existing result object shape.

Do not update an existing row's publish date or template size. The current
migration is insert-only/idempotent, and changing that policy is outside this
performance change.

**Verify**: `npm --workspace packages/oc run build` → exit 0 and no TypeScript or lint errors.

### Step 2: Update migration unit fixtures and add prefilter coverage

In `packages/oc/test/unit/registry-domain-metadata-migration.js`, update every
minimal metadata-store fixture used by backfill tests to provide
`getAllComponents: sinon.stub().resolves([])`.

Add focused tests covering:

- A mixed input with one existing committed row and one missing row:
  `getAllComponents()` returns the existing row; assert result
  `{ scanned: 2, inserted: 1, skipped: 1 }`, assert `addVersion()` is called
  exactly once, and assert its argument is only the missing row.
- An all-existing input: assert no `addVersion()` call and all rows are
  reported as skipped.
- An empty input: assert neither `getAllComponents()` nor `addVersion()` is
  called and the result is `{ scanned: 0, inserted: 0, skipped: 0 }`.
- A race after the prefetch: `getAllComponents()` returns no row but
  `addVersion()` rejects with `VERSION_ALREADY_EXISTS`; assert the row is
  counted as skipped. Keep the existing active-reservation test to prove
  `VERSION_PUBLISH_IN_PROGRESS` remains handled.
- A failure from `getAllComponents()`: assert that the error is propagated and
  no insert is attempted. A failed existence prefetch must not be interpreted
  as an empty table.
- Existing bounded-concurrency and non-idempotent insert-error tests still
  pass with the prefetch fixture in place.

Use the existing Chai/Sinon style in this file; do not add a new test framework
or make network calls.

**Verify**: `npm --workspace packages/oc run build && npx mocha --timeout 20000 packages/oc/test/unit/registry-domain-metadata-migration.js` → exit 0 and all migration tests pass.

### Step 3: Cover the CLI path and reported counts

In `packages/oc/test/unit/cli-facade-registry-migrate-metadata.js`, add
`getAllComponents: sinon.stub().resolves([])` to the default metadata-store
fixture so the existing CLI tests continue to represent the shared contract.

Add one CLI-focused case where the legacy source contains a row already
returned by `getAllComponents()`. Assert:

- the result has the original source count in `scanned`;
- the existing row is included in `skipped`;
- `inserted` is zero for an all-existing source;
- `metadataStore.addVersion` was not called; and
- the logger summary reports the same counts.

This proves that both the one-time CLI migration and startup reconciliation use
the same prefilter through `backfillMetadataRows()`.

**Verify**: `npx mocha --timeout 20000 packages/oc/test/unit/registry-domain-metadata-migration.js packages/oc/test/unit/cli-facade-registry-migrate-metadata.js` → exit 0 and the new count assertions pass.

### Step 4: Run package and repository verification

Run the command table above in order. Review the diff and confirm that the
change only affects candidate filtering and its tests; storage directory
enumeration, package manifest reads, publish behavior, error codes, result
fields, and cache hydration must remain unchanged.

**Verify**: `npm --workspace packages/oc run test-silent && npm run test-silent` → both commands exit 0.

## Test plan

- Model the new tests after `backfillMetadataRows()` tests in
  `packages/oc/test/unit/registry-domain-metadata-migration.js`.
- Use Sinon stubs for `getAllComponents()` and `addVersion()`; do not create an
  Azure Table or SQL connection.
- Assert both result counters and exact `addVersion()` arguments.
- Exercise the race fallback even though prefiltering should remove normal
  duplicate calls.
- Keep the existing bounded-concurrency test to ensure the limiter applies to
  the pending rows and no unbounded per-row execution is introduced.
- Run the CLI facade test to verify the user-visible migration summary.

## Done criteria

- [ ] Non-empty backfills call `getAllComponents()` once before scheduling
  candidate inserts.
- [ ] Existing committed `[name, version]` rows are filtered before
  `addVersion()` is called.
- [ ] A source row that is filtered as existing increments `skipped`.
- [ ] A concurrent insert conflict still increments `skipped` rather than
  failing the migration.
- [ ] Non-idempotent prefetch and insert errors still reject.
- [ ] Empty input performs no metadata-store reads or writes.
- [ ] For one million existing rows and 100 missing rows, only approximately
  100 rows are submitted to `addVersion()` in the non-racing case.
- [ ] Storage scanning and package manifest reads are unchanged.
- [ ] Public result shape and CLI summary format are unchanged.
- [ ] `npm --workspace packages/oc run build` exits 0.
- [ ] `npm --workspace packages/oc run test-silent` exits 0.
- [ ] `npm run test-silent` exits 0.
- [ ] No files outside the scope list are modified.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report instead of improvising if:

- A metadata adapter does not implement `getAllComponents()` despite the
  shared contract requiring it.
- The live `backfillMetadataRows()` signature or result shape differs from the
  current-state excerpt.
- Filtering existing rows would require updating their metadata values to
  preserve correctness; do not introduce update/upsert semantics in this plan.
- `getAllComponents()` failure could be safely treated as an empty result only
  by weakening an adapter error contract; fail closed instead.
- A test shows that an active `publishing` reservation is returned by
  `getAllComponents()` and must be handled differently from committed rows.
- The implementation requires modifying an adapter package, the storage
  interface, cache hydration, or public configuration.
- Build or test failures remain after two reasonable fixes, or a verification
  command requires network credentials not already configured; report the
  blocker.

## Maintenance notes

- This change removes duplicate metadata operations but is intentionally not a
  delta-aware storage reconciliation. Storage enumeration and package manifest
  reads remain proportional to the registry size.
- Cold metadata-index hydration still reads all committed rows through
  `getAllComponents()`. A later plan may pass the prefetched key set/snapshot
  into cache hydration to avoid a second full table read, but do not couple that
  lifecycle change to this plan.
- If a future adapter adds a cheaper key-only or batch-existence API, it can
  replace the full-row prefetch behind the same filtering boundary without
  changing migration result semantics.
- Preserve the race-safe `addVersion()` conflict handling: another registry can
  insert a row after the prefetch, and that conflict is expected behavior.
