'use strict';

var appStart = require('./app-start');
var baseUrlHandler = require('./middleware/base-url-handler');
var cors = require('./middleware/cors');
var discoveryHandler = require('./middleware/discovery-handler');
var EventsHandler = require('./events-handler');
var fileUploads = require('./middleware/file-uploads');
var pluginsInitialiser = require('./domain/plugins-initialiser');
var Repository = require('./domain/repository');
var requestHandler = require('./middleware/request-handler');
var Router = require('./router');
var sanitiseOptions = require('./domain/options-sanitiser');
var settings = require('../resources/settings');
var validator = require('./domain/validators');

var _ = require('underscore');
var colors = require('colors');
var express = require('express');
var format = require('stringformat');
var http = require('http');
var path = require('path');

module.exports = function(options){

  var eventsHandler = new EventsHandler(),
      repository,
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

  this.init = function(callback){
    var app = express();

    repository = new Repository(options);
    
    // middleware
    app.set('port', process.env.PORT || options.port);
    app.set('json spaces', 0);

    app.use(function(req, res, next){
      res.conf = options;
      next();
    });
    
    app.use(requestHandler(eventsHandler));
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(cors);
    app.use(fileUploads);
    app.use(baseUrlHandler);
    app.use(discoveryHandler);

    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');

    if(withLogging){
      app.use(express.logger('dev'));
    }

    if(options.local){
      app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    }

    self.app = app;
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

    if(options.local){
      app.get(format('{0}:componentName/:componentVersion/{1}*', options.prefix, settings.registry.localStaticRedirectorPath), router.staticRedirector);
    } else {
      app.put(options.prefix + ':componentName/:componentVersion', options.beforePublish, router.publish);
    }

    app.get(options.prefix, router.listComponents);

    app.get(format('{0}:componentName/:componentVersion{1}', options.prefix, settings.registry.componentInfoPath), router.componentInfo);
    app.get(format('{0}:componentName{1}', options.prefix, settings.registry.componentInfoPath), router.componentInfo);

    app.get(options.prefix + ':componentName/:componentVersion', router.component);
    app.get(options.prefix + ':componentName', router.component);

    if(!!options.routes){
      _.forEach(options.routes, function(route){
        app[route.method.toLowerCase()](route.route, route.handler);
      });
    }

    app.set('etag', 'strong');

    pluginsInitialiser.init(plugins, function(err, plugins){
      if(!!err){ return callback(err.msg); }
      options.plugins = plugins;

      repository.init(eventsHandler, function(err, componentsInfo){
        appStart(repository, options, function(err, res){

          if(!!err){ return callback(err.msg); }

          server = http.createServer(self.app);

          server.listen(self.app.get('port'), function(){
            eventsHandler.fire('start', {});
            if(withLogging){
              console.log(format('Registry started at port {0}'.green, self.app.get('port')));
              if(_.isObject(componentsInfo)){
                var componentsNumber = _.keys(componentsInfo.components).length;
                var componentsReleases = _.reduce(componentsInfo.components, function(memo, component){
                  return (parseInt(memo, 10) + component.length);
                });

                console.log(format('Registry serving {0} components for a total of {1} releases.', componentsNumber, componentsReleases).green);
              }
            }
            callback(null, {
              app: self.app,
              server: server
            });
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