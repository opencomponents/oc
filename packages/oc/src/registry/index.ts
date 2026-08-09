import type http from 'node:http';
import type { Plugin } from '../types';
import colors from '../utils/colors';
import deprecate from '../utils/deprecate';
import appStart from './app-start';
import eventsHandler from './domain/events-handler';
import type {
  HttpServerAdapterFactory,
  NativeApp
} from './domain/http-server/types';
import sanitiseOptions, { RegistryOptions } from './domain/options-sanitiser';
import * as pluginsInitialiser from './domain/plugins-initialiser';
import Repository from './domain/repository';
import getHttpServerAdapter from './domain/server-adapter';
import * as validator from './domain/validators';
import * as middleware from './middleware';
import { create as createRouter } from './router';

export { RegistryOptions };

type RegistryStartResult<TApp> = { app: TApp; server: http.Server };
type RegistryCallback<T> = (err: unknown, data?: T) => void;

export interface RegistryType<TApp = NativeApp<HttpServerAdapterFactory>> {
  close(): Promise<void>;
  close(callback: (err?: Error | string) => void): Promise<void>;
  on: typeof eventsHandler.on;
  register<T = any>(plugin: Plugin<T>): Promise<void>;
  register<T = any>(
    plugin: Plugin<T>,
    callback?: (...args: any[]) => void
  ): Promise<void>;
  start(): Promise<RegistryStartResult<TApp>>;
  start(
    callback: RegistryCallback<RegistryStartResult<TApp>>
  ): Promise<RegistryStartResult<TApp>>;
  app: TApp;
}

const warnAboutCallback = () =>
  deprecate({
    id: 'registry-lifecycle-callbacks',
    subject: 'Registry lifecycle callbacks',
    replacement: 'the returned promises'
  });

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  const errorLike = error as { message?: unknown; msg?: unknown };
  const message = errorLike?.message ?? errorLike?.msg ?? error;
  return new Error(String(message));
};

export default function registry<
  T = any,
  TServerAdapter extends HttpServerAdapterFactory = HttpServerAdapterFactory,
  TApp = NativeApp<TServerAdapter>
>(inputOptions: RegistryOptions<T, TServerAdapter>): RegistryType<TApp> {
  const validationResult =
    validator.validateRegistryConfiguration(inputOptions);
  if (!validationResult.isValid) {
    throw validationResult.message;
  }
  const options = sanitiseOptions(inputOptions);

  const plugins: Plugin[] = [];
  const adapter = middleware.bind(
    getHttpServerAdapter(options.server.adapter, options.server.options),
    options
  );
  const app = adapter.native() as TApp;
  const repository = Repository(options);

  const closePromise = (): Promise<void> => {
    const closeMetadataStore = (): Promise<void> =>
      Promise.resolve(repository.close?.()).catch(() => undefined);

    const closeServer = new Promise<void>((resolve, reject) => {
      if (!adapter.isListening()) {
        reject('not opened');
        return;
      }

      Promise.resolve(adapter.close()).then(resolve, reject);
    });

    return closeServer.finally(closeMetadataStore);
  };

  const close = (callback?: (err?: Error | string) => void): Promise<void> => {
    const promise = closePromise();
    if (!callback) {
      return promise;
    }

    warnAboutCallback();
    const callbackPromise = promise.then(
      () => callback(),
      (error) => {
        callback(error);
        throw error;
      }
    );
    void callbackPromise.catch(() => undefined);
    return callbackPromise;
  };

  const register = <T = any>(
    plugin: Plugin<T>,
    callback?: (...args: any[]) => void
  ): Promise<void> => {
    if (callback) {
      warnAboutCallback();
    }
    plugins.push(Object.assign(plugin, { callback }));
    return Promise.resolve();
  };

  const startPromise = async (): Promise<RegistryStartResult<TApp>> => {
    const ok = (msg: string) => console.log(colors.green(msg));

    try {
      options.plugins = await pluginsInitialiser.init(plugins);
      createRouter(adapter, options, repository);
      const componentsInfo = await repository.init();
      await appStart(repository, options);

      const serverError = new Promise<never>((_resolve, reject) => {
        adapter.onServerError((error) => {
          eventsHandler.fire('error', {
            code: 'EXPRESS_ERROR',
            message: error?.message ?? String(error)
          });
          reject(toError(error));
        });
      });
      void serverError.catch(() => undefined);
      const listenPromise = adapter.listen({
        port: options.port,
        timeout: options.timeout,
        keepAliveTimeout: options.keepAliveTimeout
      });

      await Promise.race([listenPromise, serverError]);
      eventsHandler.fire('start', {});

      if (options.verbosity) {
        ok(
          `Registry started at port http://localhost:${options.port}${options.prefix}`
        );

        if (componentsInfo) {
          const componentsNumber = Object.keys(
            componentsInfo.components
          ).length;
          const componentsReleases = Object.values(
            componentsInfo.components
          ).reduce((acc, component) => acc + Object.keys(component).length, 0);

          ok(
            `Registry serving ${componentsNumber} components for a total of ${componentsReleases} releases.`
          );
        }
      }

      return { app, server: adapter.httpServer() };
    } catch (err) {
      throw toError(err);
    }
  };

  const start = (
    callback?: RegistryCallback<RegistryStartResult<TApp>>
  ): Promise<RegistryStartResult<TApp>> => {
    const promise = startPromise();
    if (!callback) {
      return promise;
    }

    warnAboutCallback();
    const callbackPromise = promise.then(
      (result) => {
        callback(null, result);
        return result;
      },
      (error) => {
        callback(error);
        throw error;
      }
    );
    void callbackPromise.catch(() => undefined);
    return callbackPromise;
  };

  return {
    close,
    on: eventsHandler.on,
    register,
    start,
    app
  };
}
