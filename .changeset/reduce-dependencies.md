---
'oc': patch
'oc-client-browser': patch
'oc-storage-adapters-utils': minor
'oc-s3-storage-adapter': patch
'oc-gs-storage-adapter': patch
'oc-azure-storage-adapter': patch
---

Reduce the dependency footprint to lower the exposure to vulnerable or compromised packages.

- `oc`: replace small helper packages (`accept-language-parser`, `basic-auth-connect`, `builtin-modules`, `dependency-graph`, `getport`, `lodash.isequal`, `oc-get-unix-utc-timestamp`, `parse-author`, `read`, `require-package-name`, `semver-extra`, `serialize-error`, `try-require`, `universalify`) with internal code or Node built-ins; replace `cookie-parser`, `errorhandler`, `morgan` and `response-time` with equivalent internal Express middleware; replace `open`, `cross-spawn` and `form-data` with Node built-ins; replace `livereload` (and `ws`) with a small Server-Sent Events reload server; replace `yargs` with an internal parser that keeps the same arguments, help output and shell completion protocol; replace `targz` (`tar-fs@1`) with `tar`. Basic auth credentials are now compared in constant time. Move `@kitajs/ts-html-plugin` to dev dependencies and drop the unused `esbuild` dependency.
- `oc-client-browser`: drop `universalify` and the `serve`/`fs-extra` dev dependencies.
- `oc-storage-adapters-utils`: add a `listFiles` helper.
- Storage adapters: drop `fs-extra`, `lodash`, `nice-cache`, `node-dir` and `tmp`. The per-adapter file cache no longer schedules background refreshes, which previously re-downloaded files without ever updating the cache.
