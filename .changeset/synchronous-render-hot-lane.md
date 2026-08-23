---
"oc": patch
---

Keep the warm component render path synchronous and allocation-light: cached environment lookups no longer suspend through a promise, nested-renderer and repository callback adapters are created once per registry instead of per render, and `component-retrieved` telemetry payloads are built only when a listener exists at completion.
