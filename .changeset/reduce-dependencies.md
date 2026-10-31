---
'oc': patch
'oc-client-browser': patch
'oc-storage-adapters-utils': minor
'oc-s3-storage-adapter': patch
'oc-gs-storage-adapter': patch
'oc-azure-storage-adapter': patch
---

Reduce the dependency footprint to lower the exposure to vulnerable or compromised packages.

- `oc`: replace small helper packages (`accept-language-parser`, `builtin-modules`, `dependency-graph`, `getport`, `lodash.isequal`, `oc-get-unix-utc-timestamp`, `parse-author`, `require-package-name`, `semver-extra`, `serialize-error`, `try-require`, `universalify`) with internal code or Node built-ins; replace `form-data` with undici's `FormData` and `fs.openAsBlob`; replace `targz` (`tar-fs@1`) with `tar`. Move `@kitajs/ts-html-plugin` to dev dependencies and drop the unused `esbuild` dependency. Keep the existing CLI parser, HTTP/authentication middleware, live reload, prompts, browser opening and cross-platform process spawning.
- `oc-client-browser`: drop `universalify` and the `fs-extra` dev dependency; keep `serve` for development.
- `oc-storage-adapters-utils`: add a `listFiles` helper that follows symlinked files and directories, preserving upload behavior.
- Storage adapters: drop `fs-extra`, `lodash`, `nice-cache`, `node-dir` and `tmp`. The per-adapter file cache no longer schedules background refreshes, which previously re-downloaded files without ever updating the cache.
