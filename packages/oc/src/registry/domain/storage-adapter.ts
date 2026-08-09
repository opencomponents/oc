import type {
  LegacyStorageAdapter,
  StorageAdapter,
  StorageAdapterInput
} from 'oc-storage-adapters-utils';
import { fromCallback } from 'universalify';
import deprecate from '../../utils/deprecate';

const officialAdapters = {
  s3: { name: 'oc-s3-storage-adapter', firstPromiseBasedVersion: '1.2.0' },
  gs: { name: 'oc-gs-storage-adapter', firstPromiseBasedVersion: '1.1.0' },
  'azure-blob-storage': {
    name: 'oc-azure-storage-adapter',
    firstPromiseBasedVersion: '0.1.0'
  }
};
type OfficialAdapter = keyof typeof officialAdapters;

const isOfficialAdapter = (
  adapter: LegacyStorageAdapter
): adapter is LegacyStorageAdapter & { adapterType: OfficialAdapter } =>
  Object.hasOwn(officialAdapters, adapter.adapterType);

const isPromiseBased = (adapter: StorageAdapterInput): boolean => {
  if (adapter.adapterApi) {
    return adapter.adapterApi === 'promise';
  }

  if (typeof adapter.getFile !== 'function') {
    return true;
  }

  try {
    const result = (adapter as StorageAdapter).getFile('');
    if (result && typeof result.then === 'function') {
      void result.catch(() => undefined);
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

const warnAboutLegacyAdapter = (adapter: LegacyStorageAdapter): void => {
  if (isOfficialAdapter(adapter)) {
    const pkg = officialAdapters[adapter.adapterType];
    deprecate({
      id: `storage-adapter-callback:${adapter.adapterType}`,
      subject: `The callback interface for ${pkg.name}`,
      replacement: `${pkg.name} ${pkg.firstPromiseBasedVersion} or later`
    });
    return;
  }

  deprecate({
    id: 'storage-adapter-callback:custom',
    subject: 'Callback-based storage adapters',
    replacement: 'a promise-returning storage adapter'
  });
};

const convertMethod = (adapter: LegacyStorageAdapter, method: string) => {
  const implementation = adapter[method as keyof LegacyStorageAdapter];
  return typeof implementation === 'function'
    ? fromCallback((implementation as (...args: any[]) => void).bind(adapter))
    : implementation;
};

const convertLegacyAdapter = (adapter: LegacyStorageAdapter): StorageAdapter =>
  ({
    ...adapter,
    adapterApi: 'promise',
    getFile: convertMethod(adapter, 'getFile'),
    getJson: convertMethod(adapter, 'getJson'),
    listSubDirectories: convertMethod(adapter, 'listSubDirectories'),
    putDir: convertMethod(adapter, 'putDir'),
    putFile: convertMethod(adapter, 'putFile'),
    putFileContent: convertMethod(adapter, 'putFileContent'),
    removeDir: convertMethod(adapter, 'removeDir'),
    removeFile: convertMethod(adapter, 'removeFile'),
    getUrl: adapter.getUrl.bind(adapter),
    ...(adapter.isValid ? { isValid: adapter.isValid.bind(adapter) } : {})
  }) as StorageAdapter;

/**
 * Returns the promise-first storage contract used internally by the registry.
 * Callback-only adapters remain supported on 0.x and are converted lazily by
 * universalify, so their original errors and callback behavior are preserved.
 */
export default function getPromiseBasedAdapter(
  adapter: StorageAdapterInput
): StorageAdapter {
  if (isPromiseBased(adapter)) {
    return adapter as StorageAdapter;
  }

  warnAboutLegacyAdapter(adapter as LegacyStorageAdapter);
  return convertLegacyAdapter(adapter as LegacyStorageAdapter);
}
