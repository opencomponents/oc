'use strict';

const async = require('async');
const colors = require('colors/safe');
const express = require('express');
const format = require('stringformat');
const http = require('http');
const _ = require('underscore');

const appStart = require('./app-start');
const eventsHandler = require('./domain/events-handler');
const middleware = require('./middleware');
const pluginsInitialiser = require('./domain/plugins-initialiser');
const Repository = require('./domain/repository');
const router = require('./router');
const sanitiseOptions = require('./domain/options-sanitiser');
const validator = require('./domain/validators');

module.exports = function(options){

  let repository,
      self = this,
      server,
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

  this.register = function(plugin, cb){
    plugins.push(_.extend(plugin, { callback: cb }));
  };

  this.start = function(callback){

    if(!_.isFunction(callback)){
      callback = _.noop;
    }

    router.create(this.app, options, repository);

    async.waterfall([
      function(cb){
        pluginsInitialiser.init(plugins, cb);
      },
      function(plugins, cb){
        options.plugins = plugins;
        repository.init(cb);
      },
      function(componentsInfo, cb){
        appStart(repository, options, function(err){
          cb(err ? err.msg : null, componentsInfo);
        });
      }
    ],
    function(err, componentsInfo){
      if(err){ return callback(err); }

      server = http.createServer(self.app);

      server.listen(options.port, function(err){
        
        if(err){ return callback(err); }

        eventsHandler.fire('start', {});
        
        if(options.verbosity){

          console.log(format(colors.green('Registry started at port {0}'), self.app.get('port')));
          
          if(_.isObject(componentsInfo)){

            let componentsNumber = _.keys(componentsInfo.components).length,
                componentsReleases = _.reduce(componentsInfo.components, function(memo, component){
                  return (parseInt(memo, 10) + component.length);
                });

            console.log(format(colors.green('Registry serving {0} components for a total of {1} releases.', componentsNumber, componentsReleases)));
          }
        }

        callback(null, { app: self.app, server: server });
      });

      server.on('error', function(e){
        eventsHandler.fire('error', { code: 'EXPRESS_ERROR', message: e });
        callback(e);
      });
    });
  };

  this.init();
};
