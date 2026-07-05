# HTTP Server Adapter Status

Tracks progress for the HTTP server adapter migration plan.

## Summary

| Phase | Status | Notes |
|---|---|---|
| 1. Express pre-work cleanups | Done | Implemented in PR #1507 / commit `b7d5f07b`. Removes `req.route.path`, replaces startup `app.get('port')`, normalizes response header writes. |
| 2. Add neutral facade and adapter interfaces | Done | Added in-core type-only module at `packages/oc/src/registry/domain/http-server/types.ts`; no runtime wiring changed. |
| 3. Implement and wire Express adapter | Not started | Behavior-preserving refactor through the adapter: app creation, middleware/router registration, server lifecycle, errors, close, `native()`, `httpServer()`. |
| 4. Finish core neutralization | Not started | Switch streams to `res.stream()`, neutralize handler/middleware types, remove core dependence on Express globals while keeping public Express augmentation exported. |
| 5. Add `server.adapter` config and normaliser | Not started | Mirror storage adapter selection/defaulting and compat-shim pattern. Express remains the only adapter at this stage. |
| 6. Add Fastify adapter and dual-adapter tests | Not started | Separate package, opt-in. Add parity coverage for ETag/304, OPTIONS, urlencoded/query parsing, multipart publish, streaming, and other gotchas. |

## Done

### Phase 1 — Express pre-work cleanups

Completed in PR #1507.

Changes:

- Replaced `req.route.path` usage in `static-redirector` with explicit route identities supplied by `router.ts`.
- Registered separate static redirector handlers for:
  - `client`
  - `dev-client`
  - `client-map`
  - `local-static`
- Replaced startup logging dependency on Express app settings:
  - from `app.get('port')`
  - to `options.port`
- Normalized internal response header writes to `res.set(...)` in registry code.

Verification:

- `npm run build -w oc`
- `npm run test -w oc` — 927 passing

### Phase 2 — Add neutral facade and adapter interfaces

Completed in the current Phase 2 branch.

Changes:

- Added in-core type-only module at `packages/oc/src/registry/domain/http-server/types.ts`.
- Added neutral request/response facade types:
  - `OcRequest`
  - `OcResponse`
  - `OcHandler`
- Added supporting adapter types:
  - `Method`
  - `UploadedFile`
  - `ExpressMiddleware`
  - `HttpServerAdapter`
- Kept current Express runtime wiring unchanged.
- Deferred external `oc-server-adapter-utils` extraction until an external adapter is published.

Verification:

- `npm run build -w oc`

## Remaining work

### Phase 3 — Implement and wire Express adapter

Goal: move existing Express behavior behind the adapter without behavior changes.

Expected work:

- Implement in-core Express adapter.
- Preserve eager native app creation so `Registry(opts).app` remains immediately available.
- Route `middleware/index.ts`, `router.ts`, and `registry/index.ts` through the adapter.
- Move server lifecycle behind adapter methods:
  - `listen`
  - `onServerError`
  - `close`
  - `isListening`
  - `httpServer`
- Preserve public callback contract:
  - `{ app: express.Express; server: http.Server }`

### Phase 4 — Finish core neutralization

Goal: remove remaining Express assumptions from core handlers/middleware.

Expected work:

- Replace stream piping call sites with `res.stream(readable)`.
- Convert registry route/middleware typings from Express `Request`/`Response` to neutral facade types.
- Move core use of custom fields to `OcRequest`/`OcResponse`:
  - `req.user`
  - `res.conf`
  - `res.errorCode`
  - `res.errorDetails`
- Keep Express global augmentation publicly exported for compatibility.

### Phase 5 — Add server adapter config and normaliser

Goal: make adapter selection configurable while still defaulting to Express.

Expected work:

- Add config shape:
  - `server.adapter`
  - `server.options`
- Add defaulting in `options-sanitiser.ts`, mirroring storage adapter defaulting.
- Add normaliser/compat shim analogous to `registry/domain/storage-adapter.ts`.
- Keep Express-only behavior at this stage.

### Phase 6 — Add Fastify adapter and parity tests

Goal: add opt-in Fastify support against the stable adapter interface.

Expected work:

- Create separate Fastify adapter package.
- Implement adapter-native capabilities:
  - body parsing
  - cookies
  - multipart uploads
  - request timing
  - logging
  - local error handling
  - ETag behavior
  - OPTIONS/HEAD parity
- Parameterize acceptance tests over Express and Fastify adapters.
- Add targeted parity tests for known gotchas:
  - ETag / conditional 304
  - CORS preflight OPTIONS
  - urlencoded `qs` semantics
  - query parsing differences
  - multipart publish
  - streamed responses
  - route wildcard/splat normalization
  - default 404/error body differences, if normalized

## Suggested next step

Start Phase 3 by implementing the in-core Express adapter as a behavior-preserving refactor. Keep Express as the only wired adapter until the lifecycle, middleware, and router behavior are verified through the existing suite.
