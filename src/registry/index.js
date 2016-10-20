'use strict';

var colors = require('colors');
var express = require('express');
var format = require('stringformat');
var http = require('http');
var _ = require('underscore');

var appStart = require('./app-start');
var middleware = require('./middleware');
var pluginsInitialiser = require('./domain/plugins-initialiser');
var Repository = require('./domain/repository');
var Router = require('./router');
var sanitiseOptions = require('./domain/options-sanitiser');
var settings = require('../resources/settings');
var validator = require('./domain/validators');

module.exports = function(options){

  var repository,
      self = this,
      server,
      withLogging = !_.has(options, 'verbosity') || options.verbosity > 0,
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

    var app = this.app;

    // routes
    app.use(app.router);
    var router = new Router(options, repository);

    if(options.prefix !== '/'){
      app.get('/', function(req, res){ res.redirect(options.prefix); });
      app.get(options.prefix.substr(0, options.prefix.length - 1), router.listComponents);
    }

    app.get(options.prefix + 'oc-client/client.js', router.staticRedirector);
    app.get(options.prefix + 'oc-client/oc-client.min.map', router.staticRedirector);

    if(options.local){
      app.get(format('{0}:componentName/:componentVersion/{1}*', options.prefix, settings.registry.localStaticRedirectorPath), router.staticRedirector);
    } else {
      app.put(options.prefix + ':componentName/:componentVersion', options.beforePublish, router.publish);
    }

    app.get(options.prefix, router.listComponents);
    app.post(options.prefix, router.components);

    app.get(format('{0}:componentName/:componentVersion{1}', options.prefix, settings.registry.componentInfoPath), router.componentInfo);
    app.get(format('{0}:componentName{1}', options.prefix, settings.registry.componentInfoPath), router.componentInfo);

    app.get(format('{0}:componentName/:componentVersion{1}', options.prefix, settings.registry.componentPreviewPath), router.componentPreview);
    app.get(format('{0}:componentName{1}', options.prefix, settings.registry.componentPreviewPath), router.componentPreview);

    app.get(options.prefix + ':componentName/:componentVersion', router.component);
    app.get(options.prefix + ':componentName', router.component);

    if(!!options.routes){
      _.forEach(options.routes, function(route){
        app[route.method.toLowerCase()](route.route, route.handler);
      });
    }

    app.set('etag', 'strong');

    pluginsInitialiser.init(plugins, function(err, plugins){

      if(!!err){ return callback(err); }
      
      options.plugins = plugins;

      repository.init(function(err, componentsInfo){

        if(!!err){ return callback(err); }

        appStart(repository, options, function(err, res){

          if(!!err){ return callback(err.msg); }

          server = http.createServer(self.app);

          server.listen(self.app.get('port'), function(err){
            
            if(!!err){ return callback(err); }

            eventsHandler.fire('start', {});
            
            if(withLogging){

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
      });
    });
  };

  this.init();
};
