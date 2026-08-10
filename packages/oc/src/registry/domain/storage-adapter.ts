import type { StorageAdapter } from 'oc-storage-adapters-utils';
import { fromCallback } from 'universalify';
import deprecate from '../../utils/deprecate';

type RemovePromiseOverload<T> = T extends {
  (...args: infer B): void;
  (...args: any[]): Promise<any>;
}
  ? (...args: B) => void
  : T;

type LegacyStorageAdapter = {
  [P in keyof StorageAdapter]: RemovePromiseOverload<StorageAdapter[P]>;
};

const officialAdapters = {
  s3: { name: 'oc-s3-storage-adapter', firstPromiseBasedVersion: '1.2.0' },
  gs: { name: 'oc-gs-storage-adapter', firstPromiseBasedVersion: '1.1.0' },
  'azure-blob-storage': {
    name: 'oc-azure-storage-adapter',
    firstPromiseBasedVersion: '0.1.0'
  }
};
type OfficialAdapter = keyof typeof officialAdapters;

function isOfficialAdapter(
  adapter: LegacyStorageAdapter
): adapter is LegacyStorageAdapter & { adapterType: OfficialAdapter } {
  return Object.keys(officialAdapters).includes(
    adapter.adapterType as OfficialAdapter
  );
}

function isPromiseBased(tryFunction: () => unknown) {
  try {
    (tryFunction as () => Promise<unknown>)().catch(() => {
      // To not throw unhandled promise exceptions
    });
    return true;
  } catch {
    return false;
  }
}

function isLegacyAdapter(
  adapter: StorageAdapter | LegacyStorageAdapter
): adapter is LegacyStorageAdapter {
  return !isPromiseBased(() => (adapter as StorageAdapter).getFile(''));
}

function convertLegacyAdapter(adapter: LegacyStorageAdapter): StorageAdapter {
  const toPromise = (method: unknown) =>
    typeof method === 'function'
      ? fromCallback((method as (...args: any[]) => void).bind(adapter))
      : method;

  return {
    getFile: toPromise(adapter.getFile),
    getJson: toPromise(adapter.getJson),
    listSubDirectories: toPromise(adapter.listSubDirectories),
    putDir: toPromise(adapter.putDir),
    putFile: toPromise(adapter.putFile),
    putFileContent: toPromise(adapter.putFileContent),
    removeDir: toPromise(adapter.removeDir),
    removeFile: toPromise(adapter.removeFile),
    getUrl: adapter.getUrl.bind(adapter),
    maxConcurrentRequests: adapter.maxConcurrentRequests,
    adapterType: adapter.adapterType,
    isValid: adapter.isValid?.bind(adapter)
  } as any;
}

const warnAboutCallbacks = (adapter: LegacyStorageAdapter) => {
  if (isOfficialAdapter(adapter)) {
    const pkg = officialAdapters[adapter.adapterType];
    deprecate({
      id: `storage-adapter-callbacks-${adapter.adapterType}`,
      subject: `The callback API of ${pkg.name}`,
      replacement: `the promise API from ${pkg.name}@${pkg.firstPromiseBasedVersion} or newer`
    });
    return;
  }

  deprecate({
    id: 'storage-adapter-callbacks',
    subject: 'Storage adapter callbacks',
    replacement: 'promise-based storage adapter methods'
  });
};

export default function getPromiseBasedAdapter(
  adapter: StorageAdapter | LegacyStorageAdapter
): StorageAdapter {
  if (isLegacyAdapter(adapter)) {
    warnAboutCallbacks(adapter);

    return convertLegacyAdapter(adapter);
  }

  return adapter;
}
