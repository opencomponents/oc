# Metadata scaling option B — implementation status

## Current status

The same-version publish storage overwrite issue is addressed with a metadata
reservation state machine: metadata-mode publish reserves `name@version` before
uploading storage bytes, commits after upload, and best-effort aborts on failure.
Public metadata reads return committed rows only.

Core metadata-store support is implemented and verified, including the optional
`close()` lifecycle hook wired into `registry.close()` and the
`oc registry migrate-metadata` CLI. Two Azure metadata adapters are implemented:
Azure SQL (connection-pool based) and Azure Table Storage (HTTP-based, schemaless,
same storage account as blobs). Both ship env-var-gated integration tests; the
integration tests still need a live Azure run to execute. The S3/GS
`listSubDirectories` pagination prerequisite is fixed in the external
`storage-adapters` repo. Remaining work is the deferred-by-decision items only.

## Done

### Core metadata interface and config
- Added `ComponentRow`, `MetadataStore`, and `MetadataConfig` types in `packages/oc/src/types.ts`.
- Added optional `metadata` config on registry `Config`.
- Kept metadata enablement presence-based: no `metadata` block means existing storage mode remains the default.
- Kept `manageSchema`, `reconcileFromStorage`, and `exportLegacyFiles` as metadata config fields, with the current adapter decision that operational adapter flags are passed through adapter `options`.

### Shared metadata snapshot/index
- Added `packages/oc/src/registry/domain/metadata-index.ts`.
- Added row-to-cache transformations:
  - `ComponentRow[]` → `ComponentsList`
  - `ComponentRow[]` → `ComponentsDetails`
  - `lastEdit` on both is derived from the data (max `publishDate` across rows) rather than wall-clock time, so it only advances on a real publish — keeping the poll's `data.lastEdit > cached.lastEdit` guard meaningful and the exported legacy files' `lastEdit` accurate.
- Added `createMetadataIndex()` so DB mode uses a shared snapshot for list/details caches.
- Refactored DB-mode cache lifecycle so startup and polling use one `getAllComponents()` query for both list and details data.
- Prevented `components-details` from starting a second DB polling loop in metadata mode.
- Added `MetadataIndex.add(row)` for immediate in-memory snapshot updates after successful metadata-mode publish. The update is incremental — it rebuilds only the published component's version list/detail (O(versions-of-that-component)) and shares every other component entry by reference, producing a new snapshot object (no in-place mutation) so in-flight readers keep a consistent view. Duplicate `name@version` is a no-op and `lastEdit` never moves backwards.

### Components cache integration
- `components-cache` now accepts an optional `MetadataIndex`.
- Metadata mode hydrates and refreshes list cache from the metadata index.
- Metadata poll failures fire an error event and keep serving the last good in-memory list cache.
- Storage mode still uses the existing `components.json` + directory scan path.

### Components details integration
- `components-details` now accepts an optional `MetadataIndex`.
- Metadata mode hydrates details from the shared metadata snapshot.
- Metadata-mode route reads use the latest shared snapshot rather than an independent details copy.
- Storage mode still uses the existing `components-details.json` + package-json fetch path.

### Metadata migration/backfill
- Added `packages/oc/src/registry/domain/metadata-migration.ts`.
- Added conversion from `components-details.json` shape to `ComponentRow[]`.
- Added backfill helper that inserts rows into `MetadataStore`.
- Existing rows reported as `VERSION_ALREADY_EXISTS` are treated as skipped/no-op for idempotent backfills.
- Non-idempotent metadata insert errors are rethrown.
- Added storage helper to read `${componentsDir}/components-details.json` and backfill from it.
- Added storage-directory scan fallback when `components-details.json` is missing, deriving metadata rows from component/version `package.json` files.
- Added `oc registry migrate-metadata <configPath>` command.
- The command loads a registry config module, validates/sanitises it, initialises the configured metadata store, backfills from `components-details.json` or the storage directory scan fallback, and logs `{ scanned, inserted, skipped }`.

### Repository integration
- Repository creates the metadata adapter when `conf.metadata` is present.
- Repository initialises the metadata store before loading caches.
- When `metadata.reconcileFromStorage` is enabled, repository startup scans storage and idempotently inserts missing metadata rows before cache hydration.
- When `metadata.exportLegacyFiles` is enabled, repository startup writes DB-derived `components.json` and `components-details.json` projections to storage. The export is decoupled from the publish path; an optional `metadata.exportLegacyFilesInterval` (seconds) refreshes the projections on a non-overlapping background timer that is cleared on `registry.close()`. Publish never triggers the export, keeping publish an O(1) append.
- Publish flow now reserves metadata before touching object storage:
  1. validate publish
  2. write package json
  3. reserve metadata row with `metadataStore.reserveVersion()`
  4. upload statics to storage
  5. commit metadata row with `metadataStore.commitVersion()`
- Duplicate or in-progress metadata reservation errors with code `VERSION_ALREADY_EXISTS` / `VERSION_PUBLISH_IN_PROGRESS` are mapped to the existing registry `already_exists` publish error.
- Metadata-store startup failures stop cache loading and fail `repository.init()`.
- Metadata-store publish failures fail the publish; failures after reservation best-effort abort the reservation before returning the error.
- Existing storage-mode publish behavior remains unchanged.

### Metadata config validation
- Registry config validation now checks that a metadata adapter exists and `isValid()` passes.
- Added validation error copy for invalid metadata adapters.

### Shared adapter utilities
- Added workspace package: `packages/oc-metadata-adapters-utils`.
- Moved shared `ComponentRow`, `MetadataStore`, and `VERSION_ALREADY_EXISTS` into the package.
- Core `oc` metadata config/types now import and re-export the shared metadata contract.
- Azure SQL adapter now imports the shared contract and re-exports it for adapter consumers.

### Azure Table Storage metadata adapter package
- Added workspace package: `packages/oc-azure-table-metadata-adapter`.
- Added `@azure/data-tables` runtime dependency.
- Implemented adapter using Azure Table Storage:
  - `adapterType = 'azure-table'`
  - `isValid()` — validates connection string or endpoint (credentials optional; managed identity allowed), plus table name rules
  - Auth precedence (no connection string): account name+key → SAS token → explicit `credential` → `DefaultAzureCredential` (managed identity / workload identity / `az login`), so the registry can run with no secret
  - `initialise()` — `manageSchema !== false` creates the table via a service client built from the same credential (idempotent, `createTable` does not throw on conflict); `manageSchema === false` verifies by listing the first page of entities so a missing table fails fast (avoids the table-vs-entity 404 ambiguity of a single `getEntity`)
  - `getAllComponents()` — uses the SDK's paged async iterator (`for await ... listEntities()`), auto-paginates
  - `addVersion()` — `createEntity` with `PartitionKey = name`, `RowKey = version`; 409 Conflict → `VERSION_ALREADY_EXISTS`
  - `close()` — clears the internal client reference (HTTP-based, no connection pool)
  - Supports `connectionString`, `endpoint + accountName/accountKey`, `endpoint + sasToken`, `allowInsecureConnection` (for Azurite), and custom `tableName`
- Added package to root Biome includes and `.gitignore`.
- Added README covering registry configuration, adapter options, entity model, managed schema, runtime behavior, connection pool lifecycle, testing, and current limitations.
- Added mocked unit tests (18 passing): `isValid()`, `initialise()`, `getAllComponents()`, `addVersion()` (insert + 409 mapping + non-conflict passthrough), `close()`.
- Added env-var-gated integration tests (`OC_METADATA_TABLE_CONNECTION_STRING`), skipped without the env var, covering managed table creation, idempotent initialise, inserts, duplicate mapping, concurrent different-component inserts, custom table name, and `close()` lifecycle.

### Azure SQL metadata adapter package
- Added workspace package: `packages/oc-azure-sql-metadata-adapter`.
- Added `mssql` runtime dependency and `@types/mssql` dev dependency.
- Added strict TypeScript build setup.
- Implemented adapter skeleton:
  - `adapterType = 'azure-sql'`
  - `isValid()`
  - managed identity: when no `connectionString`, `password` or explicit `authentication` is supplied, defaults to `azure-active-directory-default` (optional `clientId` for a user-assigned identity), so the registry can connect with no secret
  - connection pool creation
  - `initialise()`
  - `manageSchema !== false` auto-creates table/index
  - `manageSchema === false` verifies schema with a zero-row select
  - `getAllComponents()`
  - `addVersion()`
  - `close()` closes and clears the process-local connection pool; safe when no pool exists; a later operation re-opens a fresh pool
  - SQL Server unique violations `2627` / `2601` mapped to `VERSION_ALREADY_EXISTS`
- Added package to root Biome includes.
- Added README covering registry configuration, adapter options, schema, runtime behavior, connection pool lifecycle, testing, and current limitations.
- Added OC package README documentation for metadata configuration, migration, bake-in/rollback flags, the continued static storage requirement, and the `registry.close()` metadata pool shutdown wiring.
- Added mocked unit tests for:
  - `isValid()` connection config validation
  - `isValid()` invalid identifier rejection
  - `initialise()` schema create/verify SQL
  - adapter option stripping before opening the SQL pool
  - invalid identifier rejection before opening the SQL pool
  - `getAllComponents()` row mapping
  - `addVersion()` parameterised inserts
  - connection pool reuse
  - SQL Server unique violation mapping
  - non-unique SQL error passthrough
  - `close()` closes an existing pool
  - `close()` is safe when no pool exists
  - `close()` allows a later operation to create a new pool
  - `close()` supports customised schema and table names

### Metadata store close() lifecycle
- Added optional `close(): Promise<void>` to the shared `MetadataStore` contract in `oc-metadata-adapters-utils`.
- OC core types re-export the updated contract unchanged (optional `close?` flows through automatically).
- Implemented `close()` in the Azure SQL adapter by closing and clearing the current connection pool.
- Exposed `repository.close()` which invokes `metadataStore.close?.()` when a metadata store is configured; storage-mode and local repositories resolve as a no-op.
- Wired `repository.close()` into the registry's existing `registry.close(callback)` shutdown hook: the HTTP server is closed first, then the metadata pool is closed; the original callback signature and error semantics are preserved.
- Wired `metadataStore.close()` into the `oc registry migrate-metadata` CLI facade via a `finally` block so the pool is released even when backfill fails.
- Added tests for the close wiring:
  - repository `close()` calls the metadata store close when present and resolves when the store has no close hook
  - registry `close()` closes the repository when the server is not listening, closes the server then the repository when listening, and still closes the repository when the server close errors
  - migrate-metadata facade closes the metadata store on success, on directory-scan fallback, and even when backfill/initialise fails

### Azure SQL adapter integration tests
- Added `packages/oc-azure-sql-metadata-adapter/test/integration.js` gated on `OC_METADATA_SQL_CONNECTION_STRING`.
- Tests are skipped (pending) when the env var is absent, so the default `npm test` run stays hermetic.
- Each run uses uniquely-named tables and drops them in cleanup, so concurrent runs against the same database do not collide.
- Integration coverage includes:
  - managed DDL creates the expected table and `ix_oc_components_name` index
  - `manageSchema: false` verifies the schema after the table exists
  - `manageSchema: false` fails fast when the table is missing
  - `addVersion()` inserts rows
  - duplicate inserts map to `VERSION_ALREADY_EXISTS` and leave the original row intact
  - different components insert concurrently without contention
  - `getAllComponents()` returns mapped rows (with and without `templateSize`)
  - custom `tableName` works against real SQL Server identifiers
  - `close()` releases the pool and a fresh store can connect afterwards

### Tests added/updated
- Components cache metadata-mode hydration.
- Components details metadata-mode hydration.
- Shared metadata snapshot reuse.
- Repository metadata-store initialisation.
- Repository publish commit into metadata store.
- Repository duplicate metadata insert mapping.
- Repository immediate metadata snapshot update after successful publish.
- Repository opt-in startup `reconcileFromStorage`.
- Repository opt-in `exportLegacyFiles` on startup and successful metadata publish.
- Repository same-version concurrent publish handling.
- Repository different-component concurrent publish handling.
- Failure injection for metadata DB down at startup.
- Failure injection for metadata DB down during poll.
- Failure injection for metadata DB down during publish.
- Metadata migration/backfill from `components-details.json`.
- Metadata migration fallback from storage directory scan.
- Idempotent metadata migration duplicate handling.
- CLI metadata migration command.
- Metadata config validation.
- Azure SQL adapter mocked unit tests.
- Azure SQL adapter `close()` mocked unit tests.
- Repository `close()` metadata-store wiring tests.
- Registry `close()` shutdown wiring tests (not-listening, listening, server close error).
- Migrate-metadata facade `close()` on success, scan fallback, and failure.
- Azure SQL adapter env-var-gated integration tests (skip when `OC_METADATA_SQL_CONNECTION_STRING` is unset).

### Verification completed
- `npm --workspace oc-metadata-adapters-utils run build`
- `npm --workspace oc-azure-sql-metadata-adapter run test`
- `npm --workspace oc-azure-sql-metadata-adapter run build`
- `npm --workspace oc run build`
- `npm --workspace oc run lint`
- `cd packages/oc && npx mocha "test/unit/registry-domain-components-cache.js" "test/unit/registry-domain-repository.js"`
- `cd packages/oc && npx mocha "test/unit/registry-domain-metadata-migration.js" "test/unit/cli-facade-registry-migrate-metadata.js"`
- `cd packages/oc && npx mocha "test/unit/registry.js" "test/unit/registry-domain-repository.js" "test/unit/registry-domain-components-cache.js" "test/unit/registry-domain-components-details.js" "test/unit/registry-domain-metadata-migration.js" "test/unit/registry-domain-validator.js" "test/unit/cli-facade-registry-migrate-metadata.js"`
- `npm run build`
- `npm --workspace oc run test-silent`
- Latest Azure SQL adapter test run: `19 passing, 8 pending` (integration tests pending without `OC_METADATA_SQL_CONNECTION_STRING`).
- Latest focused metadata-related OC unit test run: `256 passing`.
- Latest OC test run: `894 passing`.
- Latest root build: `4 successful, 4 total`.

## Accepted decisions for next implementation pass

1. Azure SQL integration tests are env-var-gated on `OC_METADATA_SQL_CONNECTION_STRING` (Docker SQL Server in CI when feasible; optional external run otherwise). Infrastructure is in place; a real SQL Server run is still needed to validate against a live database.
2. Optional metadata-store lifecycle hook `close(): Promise<void>` is implemented.
   - Optional on the shared `MetadataStore` contract.
   - Implemented in the Azure SQL adapter by closing the process-local pool.
   - Registry runtime shutdown wiring was added because an existing lifecycle hook (`registry.close(callback)`) was found; the `oc registry migrate-metadata` CLI facade also closes the pool.
3. Keep Azure SQL `schemaName` and `tableName` customisation as supported public adapter options.
4. Keep migration/backfill reporting as `{ scanned, inserted, skipped }` for now.
   - Preserve hard-fail behavior for unexpected/corrupt rows.
   - Do not add noisy progress logging in this pass.
5. Keep `metadata.reconcileFromStorage` startup-only.
   - Do not implement scheduled/background reconcile yet.
6. `metadata.exportLegacyFiles` runs on startup and, when `metadata.exportLegacyFilesInterval` (seconds) is set, on a non-overlapping background timer cleared at `registry.close()`.
   - It is decoupled from the publish path (a publish never triggers a full-registry export), so publish stays an O(1) append.
7. Do not add implicit scheduling intervals.
   - If scheduled jobs are ever added, require explicit interval configuration.
8. Keep metadata DB startup failure fail-closed for v1.
   - Do not implement degraded cold-start from exported legacy files in this pass.
9. Defer explicit readiness signaling unless a project-native health/readiness pattern is discovered.
10. Fix S3-like `listSubDirectories` pagination in the storage adapter package, not OC core. — Done: fixed in `oc-s3-storage-adapter` and `oc-gs-storage-adapter` (Azure Blob already auto-paginates).
11. Keep README docs in this PR; defer external docs-site publishing unless explicitly requested.

## Left to do

### Integration testing
- Run the env-var-gated Azure SQL integration tests against a real SQL Server instance (Docker SQL Server in CI, or a local/Azure SQL run via `OC_METADATA_SQL_CONNECTION_STRING`). The test infrastructure is in place; it only needs a live database to execute.
- Optional: wire the integration run into CI with a Docker SQL Server service container.

### Storage adapter prerequisite
  - Fixed `listSubDirectories` pagination for S3-like and GS adapters so scan-based migration/reconcile work correctly for very large registries. Implemented in the external `opencomponents/storage-adapters` repo:
  - `oc-s3-storage-adapter`: `listSubDirectories` and `removeDir` now follow the v1 `ListObjects` `Marker` / `NextMarker` (and last-`Contents`-Key fallback for `removeDir`) across pages instead of making a single capped-at-1000 call.
  - `oc-gs-storage-adapter`: `listSubDirectories` and `removeDir` now set `autoPaginate: false` and follow the `nextQuery.pageToken` across pages instead of a single `getFiles` call that ignored the page token.
  - Azure Blob was exempt: it already auto-paginates via the SDK's `for await ... listBlobsByHierarchy` / `listBlobsFlat` paged async iterator.
  - Added mocked pagination tests for both adapters (each verified to fail when the pagination loop is removed) and extended the SDK mocks to simulate paged responses. Existing tests stay green.

### Deferred by decision
- Do not expand migration result shape beyond `{ scanned, inserted, skipped }` now.
- Do not implement scheduled/background `reconcileFromStorage` now.
- Do not implement scheduled/background `exportLegacyFiles` now.
- Do not implement degraded DB-down cold start now.
- Do not add new readiness signaling now unless an existing health/readiness mechanism is found during implementation.
- Do not publish external docs-site updates unless explicitly requested.

## Files changed so far

### CLI
- `packages/oc/src/cli/commands.ts`
- `packages/oc/src/cli/index.ts`
- `packages/oc/src/cli/facade/registry-migrate-metadata.ts`

### Core
- `packages/oc/package.json`
- `packages/oc/src/types.ts`
- `packages/oc/src/registry/domain/metadata-index.ts`
- `packages/oc/src/registry/domain/metadata-migration.ts`
- `packages/oc/src/registry/domain/components-cache/index.ts`
- `packages/oc/src/registry/domain/components-details.ts`
- `packages/oc/src/registry/domain/repository.ts`
- `packages/oc/src/registry/domain/validators/registry-configuration.ts`
- `packages/oc/src/resources/index.ts`

### Tests
- `packages/oc/test/unit/registry-domain-components-cache.js`
- `packages/oc/test/unit/registry-domain-components-details.js`
- `packages/oc/test/unit/registry-domain-repository.js`
- `packages/oc/test/unit/registry-domain-metadata-migration.js`
- `packages/oc/test/unit/cli-facade-registry-migrate-metadata.js`
- `packages/oc/test/unit/registry-domain-validator.js`
- `packages/oc/test/unit/registry.js`

### Azure SQL adapter
- `packages/oc-azure-sql-metadata-adapter/README.md`
- `packages/oc-azure-sql-metadata-adapter/package.json`
- `packages/oc-azure-sql-metadata-adapter/tsconfig.json`
- `packages/oc-azure-sql-metadata-adapter/src/index.ts`
- `packages/oc-azure-sql-metadata-adapter/test/index.js`
- `packages/oc-azure-sql-metadata-adapter/test/integration.js`

### Azure Table Storage adapter
- `packages/oc-azure-table-metadata-adapter/README.md`
- `packages/oc-azure-table-metadata-adapter/package.json`
- `packages/oc-azure-table-metadata-adapter/tsconfig.json`
- `packages/oc-azure-table-metadata-adapter/src/index.ts`
- `packages/oc-azure-table-metadata-adapter/test/index.js`
- `packages/oc-azure-table-metadata-adapter/test/integration.js`

### Metadata adapter utilities
- `packages/oc-metadata-adapters-utils/package.json`
- `packages/oc-metadata-adapters-utils/tsconfig.json`
- `packages/oc-metadata-adapters-utils/src/index.ts`

### Workspace/config
- `.gitignore`
- `biome.json`
- `package-lock.json`

### Storage adapters (external repo: `storage-adapters`)
- `packages/oc-s3-storage-adapter/src/index.ts` — `listSubDirectories` + `removeDir` pagination via `Marker`/`NextMarker`/last-Key fallback.
- `packages/oc-s3-storage-adapter/__mocks__/@aws-sdk/client-s3.js` — paged `listObjects` scenario + `deleteObject` mock.
- `packages/oc-s3-storage-adapter/__test__/s3.test.ts` — pagination tests.
- `packages/oc-gs-storage-adapter/src/index.ts` — `listSubDirectories` + `removeDir` pagination via `autoPaginate:false` + `pageToken`.
- `packages/oc-gs-storage-adapter/__mocks__/@google-cloud/storage.js` — paged `getFiles` scenario + `delete` on file mocks.
- `packages/oc-gs-storage-adapter/__test__/gs.test.ts` — pagination tests.
