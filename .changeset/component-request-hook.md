---
"oc": minor
---

Add an `onComponentRequest` registry option. It runs for every component request once the version has been resolved, receives the request context and the component's package.json (including `allVersions` and `latestVersion`), and can reject the request by returning `{ status, code, error }`.
