# `@oc-framework/cli`

CLI for OpenComponents — develop, package, publish and validate components. Extracted from the `oc` god-package so registry runtimes don't pay for dev-time dependencies (`yargs`, `esbuild`, `chokidar`, …) and vice versa.

## Relationship to `oc`

This package owns the `oc` binary (`bin: { "oc": "./dist/oc-cli.js" }`).
The `oc` package is a thin shim depending on this package (and
`@oc-framework/registry`), so `npx oc <command>` keeps working unchanged:

- `npm i -g oc` (or `npx oc …`) — full experience, recommended.
- `npm i -D @oc-framework/cli` — lean local tooling; also provides an
  `oc` binary via `node_modules/.bin`.

`dev` and `registry migrate-metadata` need the registry runtime: they
load `@oc-framework/registry` lazily at command time and print a
pointer to `oc` when it isn't installed.

## Versioning

Versioned in lockstep with `oc` and `@oc-framework/registry` (see
`.changeset/config.json` `fixed` group): the publish-time CLI/registry
version gate compares them, so they must move together.
