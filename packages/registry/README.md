# `@oc-framework/registry`

Registry runtime for OpenComponents — serve and publish components.
Extracted from the `oc` god-package alongside `@oc-framework/cli`
(commands) and `@oc-framework/core` (shared domain).

## Relationship to `oc`

The `oc` package is now a thin shim: its binary and programmatic API
forward here (registry) and to `@oc-framework/cli` (commands), so
`npx oc <command>` keeps working unchanged. Install `oc` for the full
experience; depend on this package directly only if you embed a registry
in another process.

## Versioning

Versioned in lockstep with `oc` and `@oc-framework/cli` (see
`.changeset/config.json` `fixed` group): the publish-time CLI/registry
version gate compares them, so they must move together.
