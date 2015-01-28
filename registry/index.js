'use strict';

var config = require('../conf');
var express = require('express');
var format = require('../utils/format');
var http = require('http');
var multer  = require('multer');
var path = require('path');
var validator = require('./domain/validator');
var _ = require('underscore');

var routes = require('./routes');

module.exports = function(options){

  var hasPrefix = false,
      self = this,
      server,
      withLogging = !_.has(options, 'verbosity') || options.verbosity > 0;

  if(!validator.registryConfiguration(options).isValid){
    return { err: 'conf is not valid'};
  }

  this.close = function(callback){
    if(!!server){
      server.close(callback);
    } else {
      callback('not opened');
    }
  };

  this.init = function(){

    routes.init(options);

    var app = express();
    // all environments
    app.set('port', process.env.PORT || options.port);
    app.use(function (req, res, next) {
      res.removeHeader('X-Powered-By');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Headers', 'X-Requested-With, render-mode');
      res.header('Access-Control-Allow-Methods', 'GET, PUT');
      res.conf = options;

      if(!!options.dependencies){
        res.injectedDendencies = options.dependencies;
      }

      next();
    });
    
    if(!options.local){
      app.use(multer({ 
        dest: options.tempDir || config.registry.defaultTempPath,
        fieldSize: 10,
        rename: function(fieldname, filename){
          return format('{0}-{1}.tar', filename.replace('.tar', '').replace(/\W+/g, '-').toLowerCase(), Date.now());
        }
      }));
    }
    
    if(withLogging){
      app.use(express.logger('dev'));
    }

    app.use(express.json());
    app.use(express.urlencoded());
    app.use(app.router);

    // development only
    if('development' === app.get('env')){
      app.use(express.errorHandler());
    }

    if(!options.prefix){
      options.prefix = '/';
    } else {
      hasPrefix = true;
      app.get('/', function(req, res){ res.redirect(options.prefix); });
    }

    app.get(options.prefix + 'oc-client/client.js', routes.staticRedirector);

    if(options.local){
      app.get(options.prefix + ':componentName/:componentVersion/static/*', routes.staticRedirector);
    }

    app.get(options.prefix, routes.index);

    if(hasPrefix){
      app.get(options.prefix.substr(0, options.prefix.length - 1), routes.index);
    }

    app.get(format('{0}{1}{2}', options.prefix, ':componentName/:componentVersion', config.registry.componentInfoPath), routes.componentInfo);
    app.get(format('{0}{1}{2}', options.prefix, ':componentName', config.registry.componentInfoPath), routes.componentInfo);
    app.get(options.prefix + ':componentName/:componentVersion', routes.component);
    app.get(options.prefix + ':componentName', routes.component);

    if(!options.local){
      app.put(options.prefix + ':componentName/:componentVersion', routes.publish);
    }

    self.app = app;
  };

  this.start = function(callback){

    if(!_.isFunction(callback)){
      callback = _.noop;
    }

    server = http.createServer(self.app);

    server.listen(self.app.get('port'), function(){
      callback(null, self.app);
    });

    server.on('error', function(e){
      callback(e);
    });
  };

  this.init();
};