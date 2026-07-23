---
'oc-express-server-adapter': minor
'oc': patch
---

Extract the Express HTTP server adapter into `oc-express-server-adapter`.

The Express adapter remains the default registry server. This package split makes it possible to drop Express from core later and treat it as an opt-in adapter, matching `oc-fastify-server-adapter`.
