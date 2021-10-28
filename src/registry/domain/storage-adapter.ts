import { fromCallback } from 'universalify';
import { StorageAdapter } from 'oc-storage-adapters-utils';

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
  s3: { name: 'oc-s3-storage-adapter', version: '1.2.0' },
  gs: { name: 'oc-gs-storage-adapter', version: '1.1.0' },
  'azure-blob-storage': { name: 'oc-azure-storage-adapter', version: '0.1.0' }
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
  } catch (err) {
    return false;
  }
}

function isLegacyAdapter(
  adapter: StorageAdapter | LegacyStorageAdapter
): adapter is LegacyStorageAdapter {
  return !isPromiseBased(() => (adapter as StorageAdapter).getFile(''));
}

function convertLegacyAdapter(adapter: LegacyStorageAdapter): StorageAdapter {
  return {
    getFile: fromCallback(adapter.getFile),
    getJson: fromCallback(adapter.getJson),
    listSubDirectories: fromCallback(adapter.listSubDirectories),
    putDir: fromCallback(adapter.putDir),
    putFile: fromCallback(adapter.putFile),
    putFileContent: fromCallback(adapter.putFileContent),
    getUrl: adapter.getUrl,
    maxConcurrentRequests: adapter.maxConcurrentRequests,
    adapterType: adapter.adapterType
  };
}

export default function getPromiseBasedAdapter(
  adapter: StorageAdapter | LegacyStorageAdapter
): StorageAdapter {
  if (isLegacyAdapter(adapter)) {
    if (isOfficialAdapter(adapter)) {
      const pkg = officialAdapters[adapter.adapterType];
      process.emitWarning(
        `Adapters now should work with promises. Consider upgrading your package ${pkg.name} to at least version ${pkg.version}`,
        'DeprecationWarning'
      );
    } else {
      process.emitWarning(
        'Your adapter is using the old interface of working with callbacks. Consider upgrading it to work with promises, as the previous one will be deprecated.',
        'DeprecationWarning'
      );
    }

    return convertLegacyAdapter(adapter);
  }

  return adapter;
}
