---
"oc": patch
---

Apply `discovery.transformInfo` to the JSON response of `GET /:name[/:version]/~preview`, which returned the raw package.json, and only serve it when `discovery.api` is enabled. The HTML preview no longer fails when a fallback registry's info has no `oc` field.
