# oc-azure-sql-metadata-adapter

Azure SQL / SQL Server metadata adapter for OpenComponents registries.

This adapter stores only the registry metadata index: component name, version,
publish date, and template size. Component static files and `package.json` files
remain in the configured OC storage adapter.

## Installation

```sh
npm install oc-azure-sql-metadata-adapter
```

## Registry configuration

Metadata mode is enabled by adding a `metadata` block to the registry
configuration. Storage is still required because the database stores only the
metadata index.

```js
const azureSqlMetadataAdapter = require('oc-azure-sql-metadata-adapter').default;

registry.configure({
  storage: {
    adapter: require('oc-s3-storage-adapter'),
    options: {
      // existing storage adapter options for component statics
    }
  },
  metadata: {
    adapter: azureSqlMetadataAdapter,
    options: {
      connectionString: process.env.OC_METADATA_SQL_CONNECTION_STRING
    }
  }
});
```

You can also pass `mssql` connection-pool options instead of a connection string:

```js
metadata: {
  adapter: azureSqlMetadataAdapter,
  options: {
    server: process.env.OC_METADATA_SQL_SERVER,
    database: process.env.OC_METADATA_SQL_DATABASE,
    user: process.env.OC_METADATA_SQL_USER,
    password: process.env.OC_METADATA_SQL_PASSWORD,
    options: {
      encrypt: true
    }
  }
}
```

The adapter passes connection settings through to `mssql`, except for the
adapter-specific options listed below. In OC registry config, `manageSchema` can
be set either in `metadata.options` or as top-level `metadata.manageSchema`; OC
forwards the top-level value to the adapter.

### Managed identity (no secret)

When no `connectionString`, `password` or explicit `authentication` is provided,
the adapter defaults to Microsoft Entra ID
(`azure-active-directory-default`), which uses the ambient managed identity /
workload identity / `az login` credential. This lets the registry connect
without any secret in config:

```js
metadata: {
  adapter: azureSqlMetadataAdapter,
  options: {
    server: process.env.OC_METADATA_SQL_SERVER,
    database: process.env.OC_METADATA_SQL_DATABASE,
    // optional user-assigned managed identity:
    // clientId: process.env.OC_METADATA_SQL_CLIENT_ID,
    options: { encrypt: true }
  }
}
```

## Adapter options

| Option | Default | Description |
| --- | --- | --- |
| `connectionString` | none | SQL Server connection string. If present, it is used instead of object connection settings. |
| `server` / `database` | none | Minimum object connection settings required when `connectionString` is not used. Other `mssql` options such as `user`, `password`, `pool`, and nested `options` are passed through. |
| `clientId` | none | Client id of a user-assigned managed identity, used only when falling back to `azure-active-directory-default` auth (no password/connection string/explicit authentication). |
| `reservationTtlSeconds` | `3600` | Age after which a `publishing` reservation is considered abandoned and can be reclaimed by a new publish or healed by storage reconciliation. |
| `manageSchema` | `true` | When `true`, the adapter creates the table/index if missing. When `false`, it verifies the expected columns with a zero-row select and fails fast if schema access is not valid. |
| `schemaName` | `dbo` | SQL schema containing the metadata table. Must be a simple SQL identifier matching `/^[A-Za-z_][A-Za-z0-9_]*$/`. |
| `tableName` | `oc_components` | Metadata table name. Must be a simple SQL identifier matching `/^[A-Za-z_][A-Za-z0-9_]*$/`. |

Component versions are stored as `NVARCHAR(128)` to allow long semver prerelease/build labels while staying within SQL Server's indexed key size with the component-name column. Versions longer than 128 characters are rejected before SQL execution with a clear adapter error.

## Managed schema

With the default `manageSchema: true`, the adapter runs DDL equivalent to:

```sql
IF OBJECT_ID(N'dbo.oc_components', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[oc_components] (
    component_name  NVARCHAR(255) NOT NULL,
    version         NVARCHAR(128) NOT NULL,
    publish_date    BIGINT        NOT NULL,
    template_size   BIGINT        NULL,
    status          NVARCHAR(16)  NOT NULL DEFAULT N'committed',
    publish_token   NVARCHAR(64)  NULL,
    created_at      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (component_name, version)
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'ix_oc_components_name'
    AND object_id = OBJECT_ID(N'dbo.oc_components', N'U')
)
BEGIN
  CREATE INDEX ix_oc_components_name ON [dbo].[oc_components] (component_name);
END;
```

The primary key is the reservation uniqueness guard. Concurrent publishes of the
same component version map SQL Server unique violations (`2627` / `2601`) to the
shared duplicate/in-progress metadata error codes before any storage upload.

## Operator-managed schema

Use `manageSchema: false` when DBAs manage schema separately:

```js
metadata: {
  adapter: azureSqlMetadataAdapter,
  options: {
    connectionString: process.env.OC_METADATA_SQL_CONNECTION_STRING,
    schemaName: 'registry',
    tableName: 'oc_components'
  },
  manageSchema: false
}
```

On startup the adapter verifies the table with:

```sql
SELECT TOP (0) component_name, version, publish_date, template_size, status, publish_token, created_at, updated_at
FROM [registry].[oc_components];
```

## Runtime behavior

- The registry initialises the metadata store before loading caches.
- Startup fails if the database cannot be initialised or queried.
- Reads are served from OC's in-memory cache; hot component reads do not hit SQL.
- Polling first checks a cheap aggregate change token (`COUNT_BIG` +
  `MAX(publish_date)`) and only re-hydrates the in-memory cache from
  `getAllComponents()` when that token changes, with a periodic full refresh
  safety net in OC core.
- If polling fails after startup, OC keeps serving the previous in-memory cache and retries on the next poll.
- Publish reserves a `publishing` metadata row first, uploads statics only after reservation succeeds, then commits the row. If upload or commit fails, OC best-effort aborts the matching reservation.
- If a publisher dies, stale `publishing` rows older than
  `reservationTtlSeconds` are reclaimed on the next same-version publish; storage
  reconciliation can also commit a stale reservation when the component files
  already exist in storage.
- When the registry is shut down via `registry.close(callback)`, the adapter closes its connection pool. The `close()` hook is optional on the shared `MetadataStore` contract and is safe to call when no pool is open.

## Connection pool lifecycle

The adapter keeps a process-local `mssql` connection pool open for the registry
lifetime. The optional `close()` method closes and clears that pool. Calling
`close()` is safe even when the pool was never opened, and a later operation
re-opens a fresh pool. The registry wires `close()` into its existing
`registry.close(callback)` shutdown hook; the `oc registry migrate-metadata` CLI
command also closes the pool before exiting.

## Current limitations

- Integration tests against a real SQL Server / Azure SQL instance are gated on
  the `OC_METADATA_SQL_CONNECTION_STRING` environment variable and are skipped
  otherwise. Run them locally or in CI against a SQL Server instance (for
  example, Docker SQL Server) by setting that variable.
- Metadata migration, backfill, storage reconciliation, and legacy file export are implemented in OC core work, not in this adapter package.

## Testing

```sh
# mocked unit tests (no database required)
npm test

# integration tests against a real SQL Server / Azure SQL instance
OC_METADATA_SQL_CONNECTION_STRING="Server=tcp:localhost,1433;Database=oc;User Id=sa;Password=...;Encrypt=true;TrustServerCertificate=true" npm test
```

The mocked unit tests run by default. The integration tests verify the managed
DDL, operator-managed schema verification, `addVersion()` inserts, duplicate
mapping to `VERSION_ALREADY_EXISTS`, `getAllComponents()` row mapping, custom
`schemaName` / `tableName` identifiers, and `close()` pool lifecycle against a
real SQL Server. Each integration run uses uniquely-named tables and drops them
afterwards, so concurrent runs against the same database do not collide.
