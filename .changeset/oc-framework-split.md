---
'oc': minor
'@oc-framework/cli': minor
'@oc-framework/core': minor
'@oc-framework/registry': minor
---

Split the `oc` god-package into scoped packages without changing
behaviour: `@oc-framework/core` (shared domain, types, utils),
`@oc-framework/cli` (all `oc` commands, owns the `oc` binary name),
`@oc-framework/registry` (registry runtime). The `oc` package is now a
thin shim re-exporting both, so `npx oc <command>` and
`require('oc')` keep working unchanged.
