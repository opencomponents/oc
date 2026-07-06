import type http from 'node:http';
import colors from 'colors/safe';
import type express from 'express';

import type { Plugin } from '../types';
import appStart from './app-start';
import eventsHandler from './domain/events-handler';
import createExpressAdapter from './domain/http-server/express-adapter';
import sanitiseOptions, { RegistryOptions } from './domain/options-sanitiser';
import * as pluginsInitialiser from './domain/plugins-initialiser';
import Repository from './domain/repository';
import * as validator from './domain/validators';
import * as middleware from './middleware';
import { create as createRouter } from './router';

export { RegistryOptions };

export default function registry<T = any>(inputOptions: RegistryOptions<T>) {
  const validationResult =
    validator.validateRegistryConfiguration(inputOptions);
  if (!validationResult.isValid) {
    throw validationResult.message;
  }
  const options = sanitiseOptions(inputOptions);

  const plugins: Plugin[] = [];
  const adapter = middleware.bind(createExpressAdapter(options.port), options);
  const app = adapter.native() as express.Express;
  const repository = Repository(options);

  const close = (
    callback: (err?: Error | undefined | string) => void
  ): void => {
    const closeMetadataStore = (): Promise<void> =>
      Promise.resolve(repository.close?.()).catch(() => undefined);

    if (adapter.isListening()) {
      adapter.close((err) => {
        void closeMetadataStore().finally(() => callback(err));
      });
      return;
    }

    void closeMetadataStore().finally(() => callback('not opened'));
  };

  const register = <T = any>(
    plugin: Plugin<T>,
    callback?: (...args: any[]) => void
  ) => {
    plugins.push(Object.assign(plugin, { callback }));
  };

  const start = async (
    callback: (
      err: unknown,
      data?: { app: express.Express; server: http.Server }
    ) => void
  ) => {
    const ok = (msg: string) => console.log(colors.green(msg));

    try {
      options.plugins = await pluginsInitialiser.init(plugins);
      createRouter(adapter, options, repository);
      const componentsInfo = await repository.init();
      await appStart(repository, options);

      adapter.listen(
        {
          port: options.port,
          timeout: options.timeout,
          keepAliveTimeout: options.keepAliveTimeout
        },
        (err?: Error) => {
          if (err) {
            return callback(err);
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

          callback(null, { app, server: adapter.httpServer() });
        }
      );

      adapter.onServerError((error) => {
        eventsHandler.fire('error', {
          code: 'EXPRESS_ERROR',
          message: error?.message ?? String(error)
        });
        callback(error);
      });
    } catch (err) {
      callback((err as any)?.msg || err);
    }
  };

  return {
    close,
    on: eventsHandler.on,
    register,
    start,
    app
  };
}
