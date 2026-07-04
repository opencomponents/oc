# oc-azure-table-metadata-adapter

Azure Table Storage metadata adapter for OpenComponents registries.

This adapter stores only the registry metadata index: component name, version,
publish date, and template size. Component static files and `package.json` files
remain in the configured OC storage adapter (e.g. Azure Blob Storage, S3).

Azure Table Storage is a natural fit for this workload: the `PartitionKey +
RowKey` uniqueness guarantee is the exact concurrency model the metadata store
needs (same component+version → one insert wins; different components never
contend), it is schemaless (no migrations framework needed), and if you already
use Azure Blob Storage for statics you can use the same storage account for the
metadata table — no second database to provision.

## Installation

```sh
npm install oc-azure-table-metadata-adapter
```

## Registry configuration

Metadata mode is enabled by adding a `metadata` block to the registry
configuration. Storage is still required because the table stores only the
metadata index.

```js
const azureTableMetadataAdapter = require('oc-azure-table-metadata-adapter').default;

registry.configure({
  storage: {
    adapter: require('oc-s3-storage-adapter'),
    options: {
      // existing storage adapter options for component statics
    }
  },
  metadata: {
    adapter: azureTableMetadataAdapter,
    options: {
      connectionString: process.env.OC_METADATA_TABLE_CONNECTION_STRING
    }
  }
});
```

You can also pass an explicit endpoint with credentials instead of a connection
string:

```js
metadata: {
  adapter: azureTableMetadataAdapter,
  options: {
    endpoint: 'https://myaccount.table.core.windows.net',
    accountName: 'myaccount',
    accountKey: process.env.AZURE_STORAGE_KEY
  }
}
```

### Managed identity (no secret)

When you pass only an `endpoint` (no `connectionString`, `accountKey` or
`sasToken`), the adapter authenticates with
[`DefaultAzureCredential`](https://learn.microsoft.com/azure/developer/javascript/sdk/credential-chains#use-defaultazurecredential-for-flexibility)
— managed identity, workload identity, `az login`, environment credentials,
etc. This lets the registry run without any secret in config:

```js
metadata: {
  adapter: azureTableMetadataAdapter,
  options: {
    endpoint: 'https://myaccount.table.core.windows.net'
    // optionally: credential: new DefaultAzureCredential({ managedIdentityClientId })
  }
}
```

For local development with [Azurite](https://github.com/Azure/Azurite):

```js
metadata: {
  adapter: azureTableMetadataAdapter,
  options: {
    connectionString: 'UseDevelopmentStorage=true',
    allowInsecureConnection: true
  }
}
```

## Adapter options

| Option | Default | Description |
| --- | --- | --- |
| `connectionString` | none | Azure Storage account connection string. If present, used instead of `endpoint` + credentials. |
| `endpoint` | none | Table service endpoint URL (e.g. `https://<account>.table.core.windows.net`). Required when `connectionString` is not used. |
| `accountName` | none | Storage account name. Required with `accountKey` when `connectionString` is not used. |
| `accountKey` | none | Storage account key. Required with `accountName` when `connectionString` is not used. |
| `sasToken` | none | SAS token — alternative to `accountKey` for authentication. |
| `credential` | none | Explicit `TokenCredential` (Microsoft Entra ID). When omitted with no key/SAS/connection string, a `DefaultAzureCredential` (managed identity) is used. |
| `tableName` | `occomponents` | Azure Table name. Must be 3–63 chars, start with a letter, and contain only alphanumeric characters. |
| `manageSchema` | `true` | When `true`, the adapter creates the table if missing (idempotent — `createTable` does not throw if the table already exists). When `false`, it verifies the table exists and fails fast if it does not. |
| `allowInsecureConnection` | `false` | Allow HTTP (insecure) connections — for Azurite or local development. |
| `reservationTtlSeconds` | `3600` | Age after which a `publishing` reservation is considered abandoned and can be reclaimed by a new publish or healed by storage reconciliation. |

Authentication precedence when `connectionString` is absent: `accountName` +
`accountKey` → `sasToken` → explicit `credential` → `DefaultAzureCredential`.
In OC registry config, `manageSchema` can be set either in `metadata.options` or
as top-level `metadata.manageSchema`; OC forwards the top-level value to the
adapter.

## Entity model

Each component version is stored as a single table entity:

| Property | Source | Description |
| --- | --- | --- |
| `PartitionKey` | `row.name` | Component name — gives partition-level isolation between components. |
| `RowKey` | `row.version` | Component version — combined with `PartitionKey` forms the unique primary key. |
| `publishDate` | `row.publishDate` | Unix timestamp (seconds). |
| `templateSize` | `row.templateSize` | Template file size in bytes. Omitted when not set. |
| `status` | adapter | `publishing` while reserved, `committed` once visible to reads. |
| `publishToken` | adapter | Reservation token used to commit or abort only the publisher that reserved the row. |
| `createdAt` | `Date.now()` | Insertion timestamp (milliseconds) — reserved for future delta cursor / audit. |
| `updatedAt` | `Date.now()` | Last reservation status update timestamp (milliseconds). |

The `PartitionKey + RowKey` uniqueness is the reservation guarantee: concurrent
publishes of the same component version map the Azure Table Storage 409 Conflict
to the shared duplicate/in-progress metadata error codes before any storage
upload.

## Managed schema

With the default `manageSchema: true`, the adapter calls `createTable` on
startup. Azure Table Storage's `createTable` is idempotent — it does not throw
if the table already exists.

Use `manageSchema: false` when operators manage the table separately. On
startup the adapter reads the first page of entities to verify the table
exists. Because Azure Table returns `404` both for a missing table and for a
missing entity, the adapter uses a list (not a single-entity `getEntity`) so an
existing-but-empty table verifies cleanly while a genuinely missing table fails
fast with a clear error.

## Runtime behavior

- The registry initialises the metadata store before loading caches.
- Startup fails if the table cannot be created or accessed.
- Reads are served from OC's in-memory cache; hot component reads do not hit
  Table Storage.
- Polling first checks a point-read cursor entity and only re-hydrates when that
  cursor changes, with a periodic full refresh safety net in OC core.
  Rehydration uses `getAllComponents()`; the `@azure/data-tables` SDK
  auto-paginates the entity query via its paged async iterator, so all rows are
  returned regardless of registry size.
- If polling fails after startup, OC keeps serving the previous in-memory cache
  and retries on the next poll.
- Publish reserves a `publishing` metadata entity first, uploads statics only
  after reservation succeeds, then commits the entity. If upload or commit fails,
  OC best-effort aborts the matching reservation.
- Successful commits update a best-effort cursor entity at `PartitionKey =
  'oc.metadata'`, `RowKey = 'cursor'`. This key cannot collide with component
  rows because OC component names reject dots.
- If a publisher dies, stale `publishing` entities older than
  `reservationTtlSeconds` are reclaimed on the next same-version publish; storage
  reconciliation can also commit a stale reservation when the component files
  already exist in storage.
- When the registry is shut down via `registry.close(callback)`, the adapter's
  `close()` is called. Since Table Storage is HTTP-based with no connection
  pool, `close()` simply clears the internal client reference and is safe to
  call even when no client was created.

## Connection pool lifecycle

Unlike the SQL adapters, this adapter has **no connection pool to manage**.
Table Storage is HTTP-based — each operation is a stateless REST call. The
`close()` method clears the internal `TableClient` reference so a subsequent
operation creates a fresh client. The registry wires `close()` into its
existing `registry.close(callback)` shutdown hook; the `oc registry
migrate-metadata` CLI command also calls it before exiting.

## Current limitations

- Integration tests against real Azure Table Storage / Azurite are gated on the
  `OC_METADATA_TABLE_CONNECTION_STRING` environment variable and are skipped
  otherwise. Run them locally or in CI against Azurite or a real storage
  account by setting that variable.
- Metadata migration, backfill, storage reconciliation, and legacy file export
  are implemented in OC core, not in this adapter package.

## Testing

```sh
# mocked unit tests (no Azure account required)
npm test

# integration tests against a real Azure Table Storage / Azurite instance
OC_METADATA_TABLE_CONNECTION_STRING="UseDevelopmentStorage=true" npm test
```

The mocked unit tests run by default. The integration tests verify managed
table creation, `addVersion()` inserts, duplicate mapping to
`VERSION_ALREADY_EXISTS`, `getAllComponents()` row mapping, custom table names,
and `close()` client lifecycle against a real table. Each integration run uses
uniquely-named tables and cleans them up afterwards.
