# oc monorepo

This repository is now set up as a monorepo foundation using npm workspaces, Turborepo and Changesets.

Current workspace packages:

- `packages/oc` (the existing `oc` package)
- `packages/oc-client-browser`
- `packages/oc-metadata-adapters-utils`
- `packages/oc-azure-sql-metadata-adapter`

## Monorepo structure

```text
.
├── .changeset/
├── package.json        # monorepo root scripts (turbo + changesets)
├── turbo.json          # task pipeline
└── packages/
    ├── oc/
    │   ├── package.json
    │   ├── src/
    │   ├── test/
    │   └── tasks/
    ├── oc-client-browser/
    ├── oc-metadata-adapters-utils/
    └── oc-azure-sql-metadata-adapter/
```

## Common commands (run from repo root)

- `npm run lint` – run lint across workspaces (via Turbo)
- `npm run build` – build all workspaces
- `npm run test` / `npm run test-silent` – run test pipelines
- `npm run changeset:status` – show pending release bumps
- `npm run release:prepare` – tests + apply pending changesets
- `npm run release:publish` – build + publish pending package releases

## Package documentation

- Package docs: `packages/oc/README.md`
- Azure SQL metadata adapter docs: `packages/oc-azure-sql-metadata-adapter/README.md`
- Package changelog: `packages/oc/CHANGELOG.md`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
