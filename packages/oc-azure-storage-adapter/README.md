# Description

`⚠️ THIS ADAPTER IS EXPERIMENTAL, USE CAREFULLY`

Allows oc registry to store its components within [Azure Blob Storage](https://azure.microsoft.com/en-gb/services/storage/blobs/).

# Configuration

```javascript
var azureStorageAdapter = require('oc-azure-storage-adapter');
...
storage: {
  adapter: azureStorageAdapter,
  options: {
    // Container that will store publicly available files.
    // It's ACL should be set to 'blob' ({ "publicAccess": "blob" })
    publicContainerName: 'oc-public',
    // Container that will store private files.
    // It's ACL should be set to 'Private' ({ "publicAccess": "off" })
    privateContainerName: 'oc-private',
    accountName: '<your_azure_account_name>',
    accountKey: '<your_very_secret_azure_account_key>',
    path: '//<your_azure_account_name>.blob.core.windows.net/<publicContainerName>/',
    componentsDir: 'components',
  }
}
...
```
