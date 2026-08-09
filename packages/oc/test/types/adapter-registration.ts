import type {
  LegacyMetadataStore,
  MetadataStore,
  MetadataStoreWithCallbacks
} from 'oc-metadata-adapters-utils';
import type {
  LegacyStorageAdapter,
  StorageAdapter,
  StorageAdapterWithCallbacks
} from 'oc-storage-adapters-utils';

declare const promiseStorageAdapter: StorageAdapter;
declare const dualStorageAdapter: StorageAdapterWithCallbacks;
declare const legacyStorageAdapter: LegacyStorageAdapter;
declare const promiseMetadataStore: MetadataStore;
declare const dualMetadataStore: MetadataStoreWithCallbacks;
declare const legacyMetadataStore: LegacyMetadataStore;

promiseStorageAdapter.getFile('path');
promiseStorageAdapter.getJson<{ ok: boolean }>('path');
dualStorageAdapter.getFile('path');
dualStorageAdapter.getFile('path', (error, value) => {
  error;
  value;
});
legacyStorageAdapter.getFile('path', (error, value) => {
  error;
  value;
});

promiseMetadataStore.getAllComponents();
dualMetadataStore.getAllComponents();
dualMetadataStore.getAllComponents((error, rows) => {
  error;
  rows;
});
legacyMetadataStore.getAllComponents((error, rows) => {
  error;
  rows;
});
