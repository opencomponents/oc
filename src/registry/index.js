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

module.exports = function(options){

  let repository, server;

  const self = this,
    validationResult = validator.validateRegistryConfiguration(options),
    plugins = [];

  if(!validationResult.isValid){
    throw validationResult.message;
  }

  options = sanitiseOptions(options);
  this.on = eventsHandler.on;

  this.close = function(callback){
    if(server){
      server.close(callback);
    } else {
      callback('not opened');
    }
  };

  this.init = function(){
    self.app = middleware.bind(express(), options);
    repository = new Repository(options);
  };

  this.register = function(plugin, callback){
    plugins.push(_.extend(plugin, { callback }));
  };

  this.start = function(callback){

    const ok = msg => console.log(colors.green(msg));

    if(!_.isFunction(callback)){
      callback = _.noop;
    }

    router.create(this.app, options, repository);

    async.waterfall([

      cb => pluginsInitialiser.init(plugins, cb),

      (plugins, cb) => {
        options.plugins = plugins;
        repository.init(cb);
      },

      (componentsInfo, cb) => {
        appStart(repository, options, (err) => cb(err ? err.msg : null, componentsInfo));
      }
    ],
    (err, componentsInfo) => {
      if(err){ return callback(err); }

      server = http.createServer(self.app);

      server.listen(options.port, (err) => {

        if(err){ return callback(err); }

        eventsHandler.fire('start', {});

        if(options.verbosity){

          ok(`Registry started at port ${self.app.get('port')}`);

          if(_.isObject(componentsInfo)){

            const componentsNumber = _.keys(componentsInfo.components).length;
            const componentsReleases = _.reduce(componentsInfo.components, (memo, component) => (parseInt(memo, 10) + component.length));

            ok(`Registry serving ${componentsNumber} components for a total of ${componentsReleases} releases.`);
          }
        }

        callback(null, { app: self.app, server });
      });

      server.on('error', (message) => {
        eventsHandler.fire('error', { code: 'EXPRESS_ERROR', message });
        callback(message);
      });
    });
  };

  this.init();
};
