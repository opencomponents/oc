import type {
  LegacyMetadataStore,
  MetadataStore,
  MetadataStoreInput
} from 'oc-metadata-adapters-utils';
import { fromCallback } from 'universalify';
import deprecate from '../../utils/deprecate';

const warnAboutLegacyAdapter = (): void => {
  deprecate({
    id: 'metadata-adapter-callback:custom',
    subject: 'Callback-based metadata adapters',
    replacement: 'a promise-returning metadata adapter'
  });
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

const callUnmarkedMethod = <ReturnValue>(
  adapter: MetadataStoreInput,
  method: (...args: any[]) => unknown,
  args: unknown[]
): Promise<ReturnValue> =>
  new Promise<ReturnValue>((resolve, reject) => {
    let settled = false;
    const callback = (error: unknown, value?: ReturnValue) => {
      warnAboutLegacyAdapter();
      if (settled) {
        return;
      }
      settled = true;
      if (error != null) {
        reject(error);
      } else {
        resolve(value as ReturnValue);
      }
    };

    let result: unknown;
    try {
      result = method.apply(adapter, [...args, callback]);
    } catch (error) {
      reject(error);
      return;
    }

    if (result && typeof (result as Promise<unknown>).then === 'function') {
      Promise.resolve(result).then(
        (value) => {
          if (!settled) {
            settled = true;
            resolve(value as ReturnValue);
          }
        },
        (error) => {
          if (!settled) {
            settled = true;
            reject(error);
          }
        }
      );
    }
  });

const convertUnmarkedAdapter = (adapter: MetadataStoreInput): MetadataStore => {
  const method = (name: keyof MetadataStore) => {
    const implementation = adapter[name];
    return typeof implementation === 'function'
      ? (...args: any[]) =>
          callUnmarkedMethod(
            adapter,
            implementation as (...args: any[]) => unknown,
            args
          )
      : implementation;
  };

  return {
    ...adapter,
    adapterApi: 'promise',
    initialise: method('initialise'),
    getAllComponents: method('getAllComponents'),
    addVersion: method('addVersion'),
    reserveVersion: method('reserveVersion'),
    commitVersion: method('commitVersion'),
    abortVersion: method('abortVersion'),
    getChangeToken: method('getChangeToken'),
    close: method('close'),
    removeVersion: method('removeVersion'),
    changesSince: method('changesSince'),
    isValid: adapter.isValid.bind(adapter)
  } as MetadataStore;
};

/**
 * Returns the promise-first metadata contract used by registry internals.
 * Explicitly marked adapters take the fast path. Unmarked custom adapters are
 * wrapped lazily so either promise or callback implementations remain usable.
 */
export default function getPromiseBasedMetadataAdapter(
  adapter: MetadataStoreInput
): MetadataStore {
  if (adapter.adapterApi === 'promise') {
    return adapter as MetadataStore;
  }

  if (adapter.adapterApi === 'callback') {
    warnAboutLegacyAdapter();
    return convertLegacyAdapter(adapter as LegacyMetadataStore);
  }

  if (typeof adapter.initialise !== 'function') {
    return adapter as MetadataStore;
  }

  return convertUnmarkedAdapter(adapter);
}
