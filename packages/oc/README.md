# ![oc](https://raw.githubusercontent.com/opencomponents/oc/master/logo-type.png)

OpenComponents, **serverless in the front-end world**.

OpenComponents is an open-source framework that allows fast-moving teams to easily build and deploy front-end components. It abstracts away complicated infrastructure and leaves developers with very simple, but powerful building blocks that handle scale transparently.

#### How does it work?

First, **you create your component**. It can contain logic to get some data (using node.js) and then the view, including css and js. It can be what you want, including _React_ or _Angular_ components or whatever you like.

Then, **you publish it** to the OpenComponents registry and you wait a couple of seconds while the registry prepares your stuff to be production-ready.

Now, every web app in your private or public network can **consume the component** via its own HTTP endpoint during server-side rendering or just in the browser.

We have been using it for more than two years in production at OpenTable, for shared components, third party widgets, e-mails and more. [Learn more about OC](http://tech.opentable.co.uk/blog/2016/04/27/opencomponents-microservices-in-the-front-end-world/).

[![npm version](https://img.shields.io/npm/v/oc.svg)](https://npmjs.org/package/oc)
[![node version](https://img.shields.io/node/v/oc.svg)](https://npmjs.org/package/oc)
[![Known Vulnerabilities](https://snyk.io/test/github/opencomponents/oc/badge.svg)](https://snyk.io/test/github/opencomponents/oc)
[![downloads](https://img.shields.io/npm/dm/oc.svg?label=downloads+from+npm)](https://npmjs.org/package/oc)
[![Join the chat at https://gitter.im/opentable/oc](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/opentable/oc?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Links

- [Website](https://opencomponents.github.io)
- [Documentation](https://opencomponents.github.io/docs/intro)
- [Requirements and build status](#requirements-and-build-status)
- [Changelog](CHANGELOG.md)
- [Awesome resources about OC](https://github.com/matteofigus/awesome-oc)
- [Contributing guidelines](../../CONTRIBUTING.md)
- [Code of conduct](../../CONTRIBUTING.md#code-of-conduct)
- [Troubleshooting](../../CONTRIBUTING.md#troubleshooting)
- [Gitter chat](https://gitter.im/opentable/oc)

## Registry metadata stores

By default, an OC registry keeps its component index in storage files:
`components.json` and `components-details.json`. A registry can instead read and
write that index through a metadata adapter by adding a `metadata` block to the
registry configuration.

Storage is still required in metadata mode. The metadata store contains only the
component name, version, publish date, and template size. Component static files
and version `package.json` files continue to live in the configured storage
adapter.

```js
const azureSqlMetadataAdapter = require('oc-azure-sql-metadata-adapter').default;
const s3StorageAdapter = require('oc-s3-storage-adapter');

registry.configure({
  storage: {
    adapter: s3StorageAdapter,
    options: {
      bucket: process.env.OC_STORAGE_BUCKET,
      region: process.env.OC_STORAGE_REGION,
      componentsDir: 'components',
      path: process.env.OC_STORAGE_BASE_URL
    }
  },
  metadata: {
    adapter: azureSqlMetadataAdapter,
    options: {
      connectionString: process.env.OC_METADATA_SQL_CONNECTION_STRING
    },
    manageSchema: true,
    reconcileFromStorage: false,
    exportLegacyFiles: false
  }
});
```

`metadata.manageSchema` defaults to `true`. Set it to `false` when operators
manage the metadata schema/table separately; OC passes the value through to the
configured metadata adapter during validation, startup, and migration.

The registry initialises the metadata store during startup. If startup succeeds,
reads are served from OC's in-memory cache, and cache polling refreshes from the
metadata store. Publishing still uploads package files to storage first, then
commits the metadata row. Duplicate metadata rows are treated as the existing
"component version already exists" publish error. When the registry is shut
down via `registry.close(callback)`, the metadata adapter's optional `close()`
hook is invoked so the adapter can release its connection pool.

Custom metadata adapters should implement the shared contract exported by
`oc-metadata-adapters-utils`:

```ts
import type { ComponentRow, MetadataStore } from 'oc-metadata-adapters-utils';
import { VERSION_ALREADY_EXISTS } from 'oc-metadata-adapters-utils';
```

### Migrating existing registries

Use the CLI backfill command before enabling metadata mode in production:

```sh
oc registry migrate-metadata ./registry.config.js
```

The argument is a path to a module that exports the same registry config object you would pass to `registry.configure()`. It must include both `storage` and `metadata`, and it must pass registry config validation. The module can be CommonJS, an ES module `default` export, or an async function returning the config — all three are accepted:

```js
// registry.config.js — CommonJS
const azureSqlMetadataAdapter = require('oc-azure-sql-metadata-adapter').default;
const s3StorageAdapter = require('oc-s3-storage-adapter');

module.exports = {
  baseUrl: 'http://my-registry.example.com/',
  storage: {
    adapter: s3StorageAdapter,
    options: {
      bucket: 'my-bucket',
      region: 'us-east-1',
      componentsDir: 'components',
      path: 'https://cdn.example.com/'
    }
  },
  metadata: {
    adapter: azureSqlMetadataAdapter,
    options: {
      connectionString: process.env.OC_METADATA_SQL_CONNECTION_STRING
    }
  }
};
```

```ts
// registry.config.ts — ES module (transpiled or run with a native ESM loader)
import azureSqlMetadataAdapter from 'oc-azure-sql-metadata-adapter';
import s3StorageAdapter from 'oc-s3-storage-adapter';

export default {
  baseUrl: 'http://my-registry.example.com/',
  storage: {
    adapter: s3StorageAdapter,
    options: {
      bucket: 'my-bucket',
      region: 'us-east-1',
      componentsDir: 'components',
      path: 'https://cdn.example.com/'
    }
  },
  metadata: {
    adapter: azureSqlMetadataAdapter,
    options: {
      connectionString: process.env.OC_METADATA_SQL_CONNECTION_STRING
    }
  }
};
```

```js
// registry.config.js — async factory (e.g. to resolve secrets first)
module.exports = async () => {
  const azureSqlMetadataAdapter = require('oc-azure-sql-metadata-adapter').default;
  const s3StorageAdapter = require('oc-s3-storage-adapter');
  const connectionString = await getSecret('oc-metadata-sql');

  return {
    baseUrl: 'http://my-registry.example.com/',
    storage: {
      adapter: s3StorageAdapter,
      options: {
        bucket: 'my-bucket',
        region: 'us-east-1',
        componentsDir: 'components',
        path: 'https://cdn.example.com/'
      }
    },
    metadata: {
      adapter: azureSqlMetadataAdapter,
      options: { connectionString }
    }
  };
};
```

The command initialises the configured metadata adapter and backfills rows from
`${componentsDir}/components-details.json`. If that file is missing, it falls back
to scanning `${componentsDir}/<component>/<version>/package.json`. Existing rows
are skipped, so the command is idempotent.

A safe migration sequence is:

1. Deploy the metadata adapter configuration to a non-serving environment.
2. Run `oc registry migrate-metadata ./registry.config.js`.
3. Start one registry instance with metadata mode enabled and verify reads.
4. Roll out metadata mode to the remaining registry instances.

### Bake-in and rollback options

Two optional flags help run storage and metadata side by side during migration:

- `metadata.reconcileFromStorage: true` scans storage on registry startup and
  inserts missing metadata rows before cache hydration. Existing rows are skipped.
- `metadata.exportLegacyFiles: true` writes DB-derived `components.json` and
  `components-details.json` projections to storage once on registry startup. It
  is **not** triggered per publish, so publishing stays an O(1) append rather
  than a full-registry scan + blob rewrite.
- `metadata.exportLegacyFilesInterval: <seconds>` additionally refreshes those
  projections on a background timer (non-overlapping) when `exportLegacyFiles`
  is enabled. Omit it to export at startup only. The timer is stopped on
  `registry.close()`.

These files are one-way projections from the metadata store. They can help with
rollback to storage mode, but they do not replace the storage adapter because
component statics remain in storage.

## Requirements and build status

Disclaimer: This project is still under heavy development and the API is likely to change at any time. In case you would find any issues, check the [troubleshooting page](../../CONTRIBUTING.md#troubleshooting).

## License

MIT
