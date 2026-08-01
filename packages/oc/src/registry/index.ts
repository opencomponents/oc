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

export interface RegistryType<TApp = NativeApp<HttpServerAdapterFactory>> {
  close: (
    callback?: (err?: Error | undefined | string) => void
  ) => Promise<void>;
  on: typeof eventsHandler.on;
  register: <T = any>(
    plugin: Plugin<T>,
    callback?: (...args: any[]) => void
  ) => Promise<void>;
  start: (
    callback?: (err: unknown, data?: { app: TApp; server: http.Server }) => void
  ) => Promise<{ app: TApp; server: http.Server }>;
  app: TApp;
}

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

  const closeInternal = (): Promise<Error | string | undefined> =>
    new Promise((resolve) => {
      const closeMetadataStore = (): Promise<void> =>
        Promise.resolve(repository.close?.()).catch(() => undefined);

      if (adapter.isListening()) {
        adapter.close((err) => {
          void closeMetadataStore().finally(() => resolve(err));
        });
        return;
      }

      void closeMetadataStore().finally(() => resolve('not opened'));
    });

  const close = (
    callback?: (err?: Error | undefined | string) => void
  ): Promise<void> => {
    if (callback) {
      deprecate({
        id: 'registry-callback-api',
        subject:
          'The callback form of `registry.start`/`registry.close`/`registry.register`',
        replacement:
          'their promises (`await registry.start()`, `await registry.close()`, `await registry.register(plugin)`)'
      });
    }

    return closeInternal().then((err) => {
      callback?.(err);
    });
  };

  const register = <T = any>(
    plugin: Plugin<T>,
    callback?: (...args: any[]) => void
  ): Promise<void> => {
    if (callback) {
      deprecate({
        id: 'registry-callback-api',
        subject:
          'The callback form of `registry.start`/`registry.close`/`registry.register`',
        replacement:
          'their promises (`await registry.start()`, `await registry.close()`, `await registry.register(plugin)`)'
      });
    }

    plugins.push(Object.assign(plugin, { callback }));

    return Promise.resolve();
  };

  const startInternal = async (): Promise<{
    app: TApp;
    server: http.Server;
  }> => {
    const ok = (msg: string) => console.log(colors.green(msg));

    options.plugins = await pluginsInitialiser.init(plugins);
    createRouter(adapter, options, repository);
    const componentsInfo = await repository.init();
    await appStart(repository, options);

    return new Promise<{ app: TApp; server: http.Server }>(
      (resolve, reject) => {
        adapter.listen(
          {
            port: options.port,
            timeout: options.timeout,
            keepAliveTimeout: options.keepAliveTimeout
          },
          (err?: Error) => {
            if (err) {
              reject(err);
              return;
            }
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
                ).reduce(
                  (acc, component) => acc + Object.keys(component).length,
                  0
                );

                ok(
                  `Registry serving ${componentsNumber} components for a total of ${componentsReleases} releases.`
                );
              }
            }

            resolve({ app, server: adapter.httpServer() });
          }
        );

        adapter.onServerError((error) => {
          eventsHandler.fire('error', {
            code: 'EXPRESS_ERROR',
            message: error?.message ?? String(error)
          });
          reject(error);
        });
      }
    );
  };

  const start = (
    callback?: (err: unknown, data?: { app: TApp; server: http.Server }) => void
  ): Promise<{ app: TApp; server: http.Server }> => {
    if (callback) {
      deprecate({
        id: 'registry-callback-api',
        subject:
          'The callback form of `registry.start`/`registry.close`/`registry.register`',
        replacement:
          'their promises (`await registry.start()`, `await registry.close()`, `await registry.register(plugin)`)'
      });
    }

    const promise = startInternal();

    if (callback) {
      promise.then(
        (res) => callback(null, res),
        (err) => callback((err as { msg?: unknown })?.msg || err)
      );
    }

    return promise;
  };

  return {
    close,
    on: eventsHandler.on,
    register,
    start,
    app
  };
}
