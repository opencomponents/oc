# oc-express-server-adapter

Express HTTP server adapter for the OC registry. Implements OC's neutral
`HttpServerAdapter` interface and is the **default** adapter used by `oc` when
no custom `server.adapter` is configured.

## Installation

```sh
npm install oc-express-server-adapter express
```

`oc` already depends on this package and uses it by default, so most registry
users do not need to install it directly. Install it yourself when you want to
configure the adapter explicitly or share the factory across projects.

## Usage

```js
const oc = require('oc');
const createExpressAdapter = require('oc-express-server-adapter').default;

const registry = oc.Registry({
  // regular OC registry options...
  server: {
    adapter: createExpressAdapter,
    options: {
      port: 3030
    }
  }
});
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `port` | `number \| string` | Optional. Stored on the Express app via `app.set('port', port)` so startup logs can read it. The registry still passes the listen port to `adapter.listen()`. |

`options` may also be a bare `number` or `string` port for convenience.

## Contract

- `registry.start()` returns a real Express application as `app`.
- `server.httpServer()` and the `{ server }` value returned by `registry.start()`
  are the underlying Node `http.Server`.
- User-supplied Connect/Express middleware (`beforePublish`, auth packages,
  custom `routes[]`) is accepted through `fromConnect()` without wrapping
  overhead when already Express-native.
- JSON bodies use `express.json({ inflate: true })` and urlencoded bodies use
  `express.urlencoded({ extended: true })`.
- Strong ETags (`app.set('etag', 'strong')`) and `json spaces = 0` match the
  historical registry behavior.
- File uploads use `multer` disk storage and populate `req.files`.

## Future

This package exists so Express can eventually become an **opt-in** dependency
of `oc` (the same way Fastify already is via `oc-fastify-server-adapter`),
instead of living inside the core package.
