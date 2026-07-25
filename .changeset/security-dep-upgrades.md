---
"oc": patch
"oc-s3-storage-adapter": patch
"oc-gs-storage-adapter": patch
"oc-azure-storage-adapter": patch
---

Security-focused dependency upgrades: bump multer, AWS SDK v3, Google Cloud Storage to v7, tmp; remove unused legacy azure-storage; migrate S3 http handler to @smithy/node-http-handler.
