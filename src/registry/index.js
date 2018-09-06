'use strict';

const async = require('async');
const colors = require('colors/safe');
const express = require('express');
const http = require('http');
const _ = require('lodash');

const appStart = require('./app-start');
const eventsHandler = require('./domain/events-handler');
const middleware = require('./middleware');
const pluginsInitialiser = require('./domain/plugins-initialiser');
const Repository = require('./domain/repository');
const router = require('./router');
const sanitiseOptions = require('./domain/options-sanitiser');
const validator = require('./domain/validators');

module.exports = function(options) {
  const validationResult = validator.validateRegistryConfiguration(options);
  if (!validationResult.isValid) {
    throw validationResult.message;
  }
  options = sanitiseOptions(options);

  const plugins = [];
  const app = middleware.bind(express(), options);
  let server;
  const repository = new Repository(options);

  const close = callback => {
    if (server && server.listening) {
      return server.close(callback);
    }
    return callback('not opened');
  };

  const register = (plugin, callback) => {
    plugins.push(_.extend(plugin, { callback }));
  };

  const start = callback => {
    const ok = msg => console.log(colors.green(msg));
    if (!_.isFunction(callback)) {
      callback = _.noop;
    }
    router.create(app, options, repository);
    async.waterfall(
      [
        cb => pluginsInitialiser.init(plugins, cb),

        (plugins, cb) => {
          options.plugins = plugins;
          repository.init(cb);
        },

        (componentsInfo, cb) => {
          appStart(repository, options, err =>
            cb(err ? err.msg : null, componentsInfo)
          );
        }
      ],
      (err, componentsInfo) => {
        if (err) {
          return callback(err);
        }

        server = http.createServer(app);
        server.timeout = options.timeout;

        server.listen(options.port, err => {
          if (err) {
            return callback(err);
          }
          eventsHandler.fire('start', {});

          if (options.verbosity) {
            ok(`Registry started at port ${app.get('port')}`);

            if (_.isObject(componentsInfo)) {
              const componentsNumber = _.keys(componentsInfo.components).length;
              const componentsReleases = _.reduce(
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

        server.on('error', message => {
          eventsHandler.fire('error', { code: 'EXPRESS_ERROR', message });
          callback(message);
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
};
