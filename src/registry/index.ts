import colors from 'colors/safe';
import express from 'express';
import http from 'node:http';
import _ from 'lodash';

import appStart from './app-start';
import eventsHandler from './domain/events-handler';
import * as middleware from './middleware';
import * as pluginsInitialiser from './domain/plugins-initialiser';
import Repository from './domain/repository';
import { create as createRouter } from './router';
import sanitiseOptions, { RegistryOptions } from './domain/options-sanitiser';
import * as validator from './domain/validators';
import type { Plugin } from '../types';

export { RegistryOptions };

export default function registry<T = any>(inputOptions: RegistryOptions<T>) {
  const validationResult =
    validator.validateRegistryConfiguration(inputOptions);
  if (!validationResult.isValid) {
    throw validationResult.message;
  }
  const options = sanitiseOptions(inputOptions);

  const plugins: Plugin[] = [];
  const app = middleware.bind(express(), options);
  let server: http.Server;
  const repository = Repository(options);

  const close = (callback: (err?: Error | undefined | string) => void) => {
    if (server?.listening) {
      return server.close(callback);
    }
    return callback('not opened');
  };

  const register = <T = any>(
    plugin: Omit<Plugin<T>, 'callback'>,
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
    // eslint-disable-next-line no-console
    const ok = (msg: string) => console.log(colors.green(msg));
    createRouter(app, options, repository);

    try {
      options.plugins = await pluginsInitialiser.init(plugins);
      const componentsInfo = await repository.init();
      await appStart(repository, options);

      server = http.createServer(app);
      server.timeout = options.timeout;
      if (options.keepAliveTimeout) {
        server.keepAliveTimeout = options.keepAliveTimeout;
      }

      // @ts-ignore Type not taking error on callback (this can error, though)
      server.listen(options.port, (err: any) => {
        if (err) {
          return callback(err);
        }
        eventsHandler.fire('start', {});

        if (options.verbosity) {
          ok(`Registry started at port http://localhost:${app.get('port')}`);

          if (_.isObject(componentsInfo)) {
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

        callback(null, { app, server });
      });

      server.on('error', error => {
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
