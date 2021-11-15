import async from 'async';
import colors from 'colors/safe';
import express from 'express';
import http from 'http';
import _ from 'lodash';

import appStart from './app-start';
import eventsHandler from './domain/events-handler';
import * as middleware from './middleware';
import * as pluginsInitialiser from './domain/plugins-initialiser';
import Repository from './domain/repository';
import * as router from './router';
import sanitiseOptions from './domain/options-sanitiser';
import * as validator from './domain/validators';
import { ComponentsList, Config, Plugin } from '../types';

interface Input extends Partial<Omit<Config, 'beforePublish'>> {
  baseUrl: string;
}

export default function registry(inputOptions: Input) {
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
    if (server && server.listening) {
      return server.close(callback);
    }
    return callback('not opened');
  };

  const register = (
    plugin: Omit<Plugin, 'callback'>,
    callback?: (...args: any[]) => void
  ) => {
    plugins.push(Object.assign(plugin, { callback }));
  };

  const start = (
    callback: (
      err: Error | null,
      data: { app: express.Express; server: http.Server }
    ) => void
  ) => {
    // eslint-disable-next-line no-console
    const ok = (msg: string) => console.log(colors.green(msg));
    if (typeof callback !== 'function') {
      callback = _.noop;
    }
    router.create(app, options, repository);
    async.waterfall(
      [
        (
          cb: (
            err: unknown,
            data: Record<string, (...args: unknown[]) => unknown>
          ) => void
        ) => pluginsInitialiser.init(plugins, cb),

        (
          plugins: Record<string, (...args: unknown[]) => void>,
          cb: (err: Error | null, data: ComponentsList | string) => void
        ) => {
          options.plugins = plugins;
          repository.init(cb);
        },

        (
          componentsInfo: ComponentsList,
          cb: (err: string | null, data: ComponentsList) => void
        ) => {
          appStart(repository, options, (err: any) =>
            cb(err ? err.msg : null, componentsInfo)
          );
        }
      ],
      (err, componentsInfo) => {
        if (err) {
          return callback(err, undefined as any);
        }

        server = http.createServer(app);
        server.timeout = options.timeout;
        if (options.keepAliveTimeout) {
          server.keepAliveTimeout = options.keepAliveTimeout;
        }

        // @ts-ignore Type not taking error on callback (this can error, though)
        server.listen(options.port, (err: any) => {
          if (err) {
            return callback(err, undefined as any);
          }
          eventsHandler.fire('start', {});

          if (options.verbosity) {
            ok(`Registry started at port ${app.get('port')}`);

            if (_.isObject(componentsInfo)) {
              const componentsNumber = Object.keys(
                // @ts-ignore
                componentsInfo.components
              ).length;
              const componentsReleases = _.reduce(
                // @ts-ignore
                componentsInfo.components,
                (memo, component) => parseInt(memo, 10) + component.length
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
          callback(error, undefined as any);
        });
      }
    );
  };

  return {
    close,
    on: eventsHandler.on,
    register,
    start,
    app
  };
}
