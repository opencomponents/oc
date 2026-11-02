# oc-s3-storage-adapter

## 2.2.6

### Patch Changes

- 1bdbadf: Reduce the dependency footprint to lower the exposure to vulnerable or compromised packages.

  - `oc`: replace small helper packages (`accept-language-parser`, `builtin-modules`, `dependency-graph`, `getport`, `lodash.isequal`, `oc-get-unix-utc-timestamp`, `parse-author`, `require-package-name`, `semver-extra`, `serialize-error`, `try-require`, `universalify`) with internal code or Node built-ins; replace `form-data` with undici's `FormData` and `fs.openAsBlob`; replace `targz` (`tar-fs@1`) with `tar`. Move `@kitajs/ts-html-plugin` to dev dependencies and drop the unused `esbuild` dependency. Keep the existing CLI parser, HTTP/authentication middleware, live reload, prompts, browser opening and cross-platform process spawning.
  - `oc-client-browser`: drop `universalify` and the `fs-extra` dev dependency; keep `serve` for development.
  - `oc-storage-adapters-utils`: add a `listFiles` helper that follows symlinked files and directories, preserving upload behavior.
  - Storage adapters: drop `fs-extra`, `lodash`, `nice-cache`, `node-dir` and `tmp`. The per-adapter file cache no longer schedules background refreshes, which previously re-downloaded files without ever updating the cache.

- 1450b36: Raise compatible dependency version ranges.
- Updated dependencies [1bdbadf]
  - oc-storage-adapters-utils@2.2.0

## 2.2.5

### Patch Changes

- 9f7ccdf: Move OC component privacy classification out of the storage adapters.
- Updated dependencies [9f7ccdf]
  - oc-storage-adapters-utils@2.1.3

## 2.2.4

### Patch Changes

- 80ce0f4: Security-focused dependency upgrades: bump multer, AWS SDK v3, Google Cloud Storage to v7, tmp; remove unused legacy azure-storage; migrate S3 http handler to @smithy/node-http-handler.
