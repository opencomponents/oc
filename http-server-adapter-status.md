# HTTP Server Adapter Status

Tracks progress for the HTTP server adapter migration plan.

## Summary

| Phase | Status | Notes |
|---|---|---|
| 1. Express pre-work cleanups | Done | Implemented in PR #1507 / commit `b7d5f07b`. Removes `req.route.path`, replaces startup `app.get('port')`, normalizes response header writes. |
| 2. Add neutral facade and adapter interfaces | Done | Added in-core type-only module at `packages/oc/src/registry/domain/http-server/types.ts`; no runtime wiring changed. |
| 3. Implement and wire Express adapter | Done | Added in-core Express adapter and wired registry app creation, middleware/router registration, server lifecycle, errors, close, `native()`, and `httpServer()` through it. |
| 4. Finish core neutralization | Done | Switched core streaming call sites to `res.stream()`, neutralized route/middleware handler types to `OcHandler`/`OcRequest`/`OcResponse`, and kept Express-only compatibility at adapter/public boundaries. |
| 5. Add `server.adapter` config and normaliser | Done | Added `server.adapter` / `server.options`, defaulted to the in-core Express adapter, and routed registry construction through the normaliser. Express remains the only adapter at this stage. |
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

### Phase 3 — Implement and wire Express adapter

Completed in the current Phase 3 branch.

Changes:

- Added in-core Express adapter at `packages/oc/src/registry/domain/http-server/express-adapter.ts`.
- Kept eager Express app creation behind `native()` so `Registry(opts).app` remains immediately available.
- Moved Express app settings, body parsing, cookies, multipart uploads, request timing, morgan logging, and local error handling behind adapter capabilities.
- Routed registry middleware and routes through `HttpServerAdapter.use(...)`, `route(...)`, and `fromConnect(...)` while preserving Express-compatible handlers for existing hooks/routes.
- Moved server creation, timeouts, keep-alive timeout, listen, server error events, close, listening checks, and `httpServer()` behind adapter lifecycle methods.
- Preserved the public start callback contract:
  - `{ app: express.Express; server: http.Server }`
- Updated registry unit tests to mock the HTTP server adapter lifecycle instead of direct Express/http internals.

Verification:

- `npm run build -w oc`
- `npm run test -w oc` — 927 passing

### Phase 4 — Finish core neutralization

Completed in the current Phase 4 branch.

Changes:

- Replaced remaining core `stream.pipe(res)` route call sites with `res.stream(readable)`:
  - streamed component responses
  - static redirector file responses
- Converted registry domain route and middleware typings from Express `Request`/`Response`/`RequestHandler` to neutral HTTP facade types:
  - `OcHandler`
  - `OcRequest`
  - `OcResponse`
- Converted portable registry middleware (`cors`, `base-url-handler`, `discovery-handler`, and `res.conf` injection) to register directly as neutral handlers instead of connect middleware.
- Kept Express/connect compatibility explicitly at adapter/public-extension boundaries:
  - `beforePublish`
  - configured user routes
  - public `Registry(opts).app` / start callback Express app contract
  - public Express global augmentation
- Normalized Express route params in the adapter facade, including wildcard `splat`, so core handlers consume string params through `OcRequest.params`.
- Adjusted Express adapter route-handler continuation semantics so neutral route handlers can complete asynchronously without falling through to later routes, while neutral `use()` middleware still continues the chain when it does not send a response.

Verification:

- `npm run build -w oc`
- `npm run test -w oc` — 927 passing

### Phase 5 — Add server adapter config and normaliser

Completed in the current Phase 5 branch.

Changes:

- Added `Config.server` with:
  - `server.adapter`
  - `server.options`
- Added server adapter defaulting in `options-sanitiser.ts`, mirroring the storage adapter defaulting pattern.
- Defaulted missing server config to the in-core Express adapter with `{ port: options.port }` options.
- Added `registry/domain/server-adapter.ts` normaliser that accepts either an adapter factory or an already-created adapter instance and validates the adapter shape.
- Updated registry construction to instantiate the HTTP adapter through `options.server.adapter` / `options.server.options` instead of directly importing the Express adapter.
- Kept Express-only behavior at this stage; the default adapter still returns the real Express app and real Node `http.Server`.
- Added unit coverage for server config defaulting, normaliser behavior, and registry adapter selection wiring.

Verification:

- `npm run build`
- `npm run test -w oc` — 937 passing

## Remaining work

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

Start Phase 6 by adding the separate Fastify adapter package and parameterizing acceptance coverage over both adapters.
