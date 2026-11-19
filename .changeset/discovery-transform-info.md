---
"oc": minor
---

Add a `discovery.transformInfo` registry option. It receives a component's package.json and returns the object sent by the discovery API (`GET /:name/~info` as JSON and `GET /?meta=...`), so registries can remove fields like `author` or add their own. It does not apply to the HTML UI nor to the `component-published` event. Also stop serving the component's root `package.json` through the `~static` route.
