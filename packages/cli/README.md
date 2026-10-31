# `@oc-framework/cli`

CLI for OpenComponents — develop, package, publish and validate components. Extracted from the `oc` god-package so registry runtimes don't pay for dev-time dependencies (`yargs`, `esbuild`, `chokidar`, …) and vice versa.

## Status

Scaffold only (branch `feat/oc-framework-cli-split`). Real implementation moves here incrementally from `packages/oc/src/cli/*`, plus the minimum it needs (`resources/`, `utils/`, `types`, validators).

## Contract with `oc`

- This package owns the `oc` binary: `bin: { "oc": "./dist/oc-cli.js" }`.
- `oc` stays as a thin shim depending on `@oc-framework/cli` (and later `@oc-framework/registry`), so `npx oc <command>` keeps working unchanged.
