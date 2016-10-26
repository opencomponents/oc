'use strict';

var async = require('async');
var colors = require('colors');
var express = require('express');
var format = require('stringformat');
var http = require('http');
var _ = require('underscore');

var appStart = require('./app-start');
var eventsHandler = require('./domain/events-handler');
var middleware = require('./middleware');
var pluginsInitialiser = require('./domain/plugins-initialiser');
var Repository = require('./domain/repository');
var router = require('./router');
var sanitiseOptions = require('./domain/options-sanitiser');
var validator = require('./domain/validators');

module.exports = function(options){

  var repository,
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
    if(!!server){
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
          cb(!!err ? err.msg : null, componentsInfo);
        });
      }
    ],
    function(err, componentsInfo){
      if(!!err){ return callback(err); }

      server = http.createServer(self.app);

      server.listen(options.port, function(err){
        
        if(!!err){ return callback(err); }

        eventsHandler.fire('start', {});
        
        if(!!options.verbosity){

          console.log(format('Registry started at port {0}'.green, self.app.get('port')));
          
          if(_.isObject(componentsInfo)){

            var componentsNumber = _.keys(componentsInfo.components).length,
                componentsReleases = _.reduce(componentsInfo.components, function(memo, component){
                  return (parseInt(memo, 10) + component.length);
                });

            console.log(format('Registry serving {0} components for a total of {1} releases.', componentsNumber, componentsReleases).green);
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
