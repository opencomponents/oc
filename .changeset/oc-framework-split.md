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

Keep template compilers in the CLI rather than the registry runtime,
preserve the full `cli.dev` registry type through shared core types,
and cover isolated CLI installs and the relocated benchmark tooling.
