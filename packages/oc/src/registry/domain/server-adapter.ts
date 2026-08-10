import deprecate from '../../utils/deprecate';
import type {
  HttpServerAdapter,
  HttpServerAdapterFactory,
  HttpServerAdapterLike,
  LegacyHttpServerAdapter,
  PromiseHttpServerAdapter
} from './http-server/types';

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | undefined)?.then === 'function';

const warnAboutCallbacks = () =>
  deprecate({
    id: 'http-server-adapter-callbacks',
    subject: 'The HTTP server adapter callback API',
    replacement: 'the returned promises'
  });

function isHttpServerAdapter(
  adapter: unknown
): adapter is HttpServerAdapterLike {
  return (
    !!adapter &&
    typeof adapter === 'object' &&
    typeof (adapter as HttpServerAdapter).native === 'function' &&
    typeof (adapter as HttpServerAdapter).listen === 'function' &&
    typeof (adapter as HttpServerAdapter).httpServer === 'function'
  );
}

const toPromise = (
  method: (...args: any[]) => unknown,
  args: unknown[]
): Promise<void> =>
  new Promise((resolve, reject) => {
    let callbackCalled = false;
    let callbackError: Error | undefined;
    let useCallback = false;
    let settled = false;
    const settle = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      error ? reject(error) : resolve();
    };
    const callback = (error?: Error) => {
      warnAboutCallbacks();
      callbackCalled = true;
      callbackError = error;
      if (useCallback) {
        settle(error);
      }
    };

    let result: unknown;
    try {
      result = method(...args, callback);
    } catch (error) {
      settle(error as Error);
      return;
    }

    if (isPromiseLike(result)) {
      void result.then(
        () => settle(),
        (error) => settle(error as Error)
      );
      return;
    }

    useCallback = true;
    warnAboutCallbacks();
    if (callbackCalled) {
      settle(callbackError);
    }
  });

const normaliseAdapter = (
  adapter: HttpServerAdapterLike
): PromiseHttpServerAdapter => {
  if (
    adapter.supportsPromiseLifecycle === true ||
    (adapter.supportsPromiseLifecycle !== false &&
      typeof (adapter as any).close !== 'function')
  ) {
    return adapter as PromiseHttpServerAdapter;
  }

  return new Proxy(adapter, {
    get(target, property) {
      if (property === 'supportsPromiseLifecycle') {
        return true;
      }
      if (property === 'listen') {
        return (options: unknown, callback?: (error?: Error) => void) => {
          if (callback) {
            warnAboutCallbacks();
            return (target as LegacyHttpServerAdapter).listen(
              options as any,
              callback
            );
          }

          return toPromise(
            (target as LegacyHttpServerAdapter).listen.bind(target),
            [options]
          );
        };
      }
      if (property === 'close') {
        return (callback?: (error?: Error) => void) => {
          if (callback) {
            warnAboutCallbacks();
            return (target as LegacyHttpServerAdapter).close(callback);
          }

          return toPromise(
            (target as LegacyHttpServerAdapter).close.bind(target),
            []
          );
        };
      }

      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  }) as unknown as PromiseHttpServerAdapter;
};

export default function getHttpServerAdapter<T = unknown>(
  adapter: HttpServerAdapterLike | HttpServerAdapterFactory<T>,
  options?: T
): PromiseHttpServerAdapter {
  if (isHttpServerAdapter(adapter)) {
    return normaliseAdapter(adapter);
  }

  const instance = adapter(options);
  if (!isHttpServerAdapter(instance)) {
    throw new Error('Invalid HTTP server adapter');
  }

  return normaliseAdapter(instance);
}
