import type {
  LegacyMetadataStore,
  MetadataStore,
  MetadataStoreInput
} from 'oc-metadata-adapters-utils';
import { fromCallback } from 'universalify';
import deprecate from '../../utils/deprecate';

const isPromiseBased = (adapter: MetadataStoreInput): boolean => {
  if (adapter.adapterApi) {
    return adapter.adapterApi === 'promise';
  }

  if (typeof adapter.initialise !== 'function') {
    return true;
  }

  // Promise methods have no trailing callback parameter. Check the required
  // methods without invoking them so validation remains side-effect free.
  const methods: Array<[unknown, number]> = [
    [adapter.initialise, 0],
    [adapter.getAllComponents, 0],
    [adapter.addVersion, 1],
    [adapter.reserveVersion, 1],
    [adapter.commitVersion, 3],
    [adapter.abortVersion, 3]
  ];

  return !methods.some(
    ([method, promiseArity]) =>
      typeof method === 'function' && method.length > promiseArity
  );
};

const convertMethod = (adapter: LegacyMetadataStore, method: string) => {
  const implementation = adapter[method as keyof LegacyMetadataStore];
  return typeof implementation === 'function'
    ? fromCallback((implementation as (...args: any[]) => void).bind(adapter))
    : implementation;
};

const convertLegacyAdapter = (adapter: LegacyMetadataStore): MetadataStore =>
  ({
    ...adapter,
    adapterApi: 'promise',
    initialise: convertMethod(adapter, 'initialise'),
    getAllComponents: convertMethod(adapter, 'getAllComponents'),
    addVersion: convertMethod(adapter, 'addVersion'),
    reserveVersion: convertMethod(adapter, 'reserveVersion'),
    commitVersion: convertMethod(adapter, 'commitVersion'),
    abortVersion: convertMethod(adapter, 'abortVersion'),
    getChangeToken: convertMethod(adapter, 'getChangeToken'),
    close: convertMethod(adapter, 'close'),
    removeVersion: convertMethod(adapter, 'removeVersion'),
    changesSince: convertMethod(adapter, 'changesSince'),
    isValid: adapter.isValid.bind(adapter)
  }) as MetadataStore;

/**
 * Returns the promise-first metadata contract used by registry internals.
 * Metadata adapters are not probed because validation must remain side-effect
 * free; callback-only custom adapters opt into the legacy shape through their
 * callback methods and are converted at this boundary.
 */
export default function getPromiseBasedMetadataAdapter(
  adapter: MetadataStoreInput
): MetadataStore {
  if (isPromiseBased(adapter)) {
    return adapter as MetadataStore;
  }

  deprecate({
    id: 'metadata-adapter-callback:custom',
    subject: 'Callback-based metadata adapters',
    replacement: 'a promise-returning metadata adapter'
  });

  return convertLegacyAdapter(adapter as LegacyMetadataStore);
}
