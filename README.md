# oc monorepo

This repository is now set up as a monorepo foundation using npm workspaces, Turborepo and Changesets.

Current workspace packages:

- `packages/oc` (the existing `oc` package)

## Monorepo structure

```text
.
├── .changeset/
├── package.json        # monorepo root scripts (turbo + changesets)
├── turbo.json          # task pipeline
└── packages/
    └── oc/
        ├── package.json
        ├── src/
        ├── test/
        └── tasks/
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
- Package changelog: `packages/oc/CHANGELOG.md`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
