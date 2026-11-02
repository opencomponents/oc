---
'oc': patch
---

Use the `statusCode` of a data provider error when it has no `status`. `ServerError` from `oc-server` sets `statusCode`, so errors like `new ServerError(401, '...')` were returned as 500.
