# Agent notes

- Install: `npm install` (npm workspaces, Node 22+; `undici` v8 requires Node >= 22.19).
- Build everything: `npm run build` (turbo). Lint: `npm run lint`.
- Test everything: `npx turbo run test-silent` (CI runs `lint` + `test-silent` on Node 22/24/26).
- `packages/oc` tests use mocha/chai/sinon/injectr against `dist` (`node tasks/mochaTest.js`); `injectr` mocks match the literal `require` string in the compiled file.
- Storage adapters, `oc-storage-adapters-utils` and `oc-fastify-server-adapter` use the built-in `node:test` runner against `dist`; module mocks go through `test-helpers/require-with-mocks.js`.
- `oc-client-browser` browser tests: `npm test -w oc-client-browser` (Playwright, served by `tasks/serve.js`).
- Prefer Node built-ins or small internal helpers in `packages/oc/src/utils` over adding new dependencies.
- Release notes go in `.changeset/*.md`.
