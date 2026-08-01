---
"oc": patch
---

Make `registry.start()`, `registry.close()`, and `registry.register()` return promises while keeping the callback form as a deprecated, dual-compatible API. Callbacks still work exactly as before, but they now emit a single shared `DeprecationWarning` (id `registry-callback-api`) pointing to the promise-based form. The promise API resolves with `{ app, server }` from `start()`, resolves from `close()`, and resolves from `register()`.
