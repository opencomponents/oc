import type { MetadataStore, MetadataStoreLike } from '../../types';
import deprecate from '../../utils/deprecate';

type MetadataMethod =
  | 'initialise'
  | 'getAllComponents'
  | 'addVersion'
  | 'reserveVersion'
  | 'commitVersion'
  | 'abortVersion'
  | 'getChangeToken'
  | 'close'
  | 'removeVersion'
  | 'changesSince';

const metadataMethods = new Set<MetadataMethod>([
  'initialise',
  'getAllComponents',
  'addVersion',
  'reserveVersion',
  'commitVersion',
  'abortVersion',
  'getChangeToken',
  'close',
  'removeVersion',
  'changesSince'
]);

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | undefined)?.then === 'function';

const warnAboutCallbacks = () =>
  deprecate({
    id: 'metadata-adapter-callbacks',
    subject: 'Metadata adapter callbacks',
    replacement: 'promise-based metadata adapter methods'
  });

const callMetadataMethod = (
  method: (...args: any[]) => unknown,
  receiver: MetadataStoreLike,
  args: unknown[]
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const suppliedCallback =
      typeof args[args.length - 1] === 'function'
        ? (args.pop() as (error?: unknown, value?: unknown) => void)
        : undefined;
    if (suppliedCallback) {
      warnAboutCallbacks();
    }
    let callbackCalled = false;
    let callbackError: unknown;
    let callbackValue: unknown;
    let useCallback = false;
    let suppliedCallbackCalled = false;

    const notifySuppliedCallback = (error?: unknown, value?: unknown) => {
      if (suppliedCallback && !suppliedCallbackCalled) {
        suppliedCallbackCalled = true;
        suppliedCallback(error, value);
      }
    };

    const callback = (error?: unknown, value?: unknown) => {
      callbackCalled = true;
      callbackError = error;
      callbackValue = value;

      notifySuppliedCallback(error, value);

      if (useCallback) {
        callbackError ? reject(callbackError) : resolve(callbackValue);
      }
    };

    let result: unknown;
    try {
      result = method.apply(receiver, [...args, callback]);
    } catch (error) {
      notifySuppliedCallback(error);
      reject(error);
      return;
    }

    if (isPromiseLike(result)) {
      void result.then(
        (value) => {
          notifySuppliedCallback(undefined, value);
          resolve(value);
        },
        (error) => {
          notifySuppliedCallback(error);
          reject(error);
        }
      );
      return;
    }

    useCallback = true;
    if (!suppliedCallback) {
      warnAboutCallbacks();
    }

    if (callbackCalled) {
      callbackError ? reject(callbackError) : resolve(callbackValue);
    }
  });

export default function getPromiseBasedMetadataAdapter(
  adapter: MetadataStoreLike
): MetadataStore {
  return new Proxy(adapter, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (
        typeof property !== 'string' ||
        !metadataMethods.has(property as MetadataMethod) ||
        typeof value !== 'function'
      ) {
        return value;
      }

      return (...args: unknown[]) =>
        callMetadataMethod(value as (...args: any[]) => unknown, target, args);
    }
  }) as unknown as MetadataStore;
}
