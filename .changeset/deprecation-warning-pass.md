---
"oc": patch
---

Add a central deprecation-warning utility and wire it into config options that will be removed in v1: the `s3` storage shortcut, `refreshInterval`, the boolean form of `discovery`, and the `oc.json` `mocks` block. Each notice fires once per process via `process.emitWarning('...', 'DeprecationWarning')` and names the deprecated option and its replacement. No behavior changes - deprecated options keep working exactly as before.
