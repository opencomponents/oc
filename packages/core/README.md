# `@oc-framework/core`

Shared domain primitives, types and utilities for the OpenComponents
`@oc-framework` packages. Extracted from the `oc` god-package so the
registry runtime and the CLI can share one implementation without
depending on each other.

## Contents

- Framework-agnostic types (`types.ts`, `http-server-types.ts`)
- Shared utils (`utils/`: colors, npm helpers, `pLimit`, …)
- CLI/registry strings and settings (`resources/`)
- Component URL builders, `oc.json` config helpers
- Storage/metadata adapter helpers (`getPromiseBasedAdapter`,
  `backfillMetadataFromStorageDetails`, …)
- Pure validators (`validateComponentName`, `validateVersion`)

## Constraints

This package must stay free of heavy runtime dependencies — no `express`,
no CLI tooling. Everything that needs a server adapter or the full
registry lives in `@oc-framework/registry`; everything interactive lives
in `@oc-framework/cli`.
