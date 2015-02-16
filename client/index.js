'use strict';

var Cache = require('nice-cache');
var config = require('../conf');
var format = require('../utils/format');
var fs = require('fs-extra');
var Handlebars = require('./renderers/handlebars');
var Jade = require('./renderers/jade');
var path = require('path');
var querystring = require('querystring');
var request = require('../utils/request');
var strings = require('../resources/index');
var url = require('url');
var vm = require('vm');
var _ = require('underscore');

var isLocal = function(apiResponse){
  return apiResponse.type === 'oc-component-local';
};

var loadConfig = function(callback){
  var mainModule = process.mainModule.filename,
      currentFolder = path.resolve(mainModule, '..');

  var checkConfigInFolder = function(baseDir, callback){
    var configInFolder = path.resolve(baseDir, config.configFile.src);

    fs.exists(configInFolder, function(exists){
      if(exists){
        fs.readJson(configInFolder, callback);
      } else {
        var nextConfigFolder = path.resolve(baseDir, '..');

        if(nextConfigFolder === baseDir){
          return callback('File not found');
        } else {
          return checkConfigInFolder(nextConfigFolder, callback);
        }
      }
    });
  };

  return checkConfigInFolder(currentFolder, callback);
};

var Client = function(conf){
  this.renderers = {
    handlebars: new Handlebars(),
    jade: new Jade()
  };

  this.cacheManager = new Cache(!!conf && !!conf.cache ? conf.cache : {});

  this.renderComponent = function(componentName, options, callback){
    var self = this;

    var getConfig = function(callback){
      if(!!self.config){
        return callback(null, self.config);
      }

      loadConfig(function(err, content){
        if(!!content){
          self.config = content;
        }

        callback(err, content);
      });
    };

    getConfig(function(err, config){
      if(!!err){
        return callback(err);
      }

      if(!!config.registries && !_.isArray(config.registries)){
        config.registries = [config.registries];
      }

      if(!config.registries || config.registries.length === 0){
        return callback('Configuration is not valid - Registry location not found');
      }

      if(!config.components || !_.has(config.components, componentName)){
        return callback('Configuration is not valid - Component not found');
      }

      var href = url.resolve(config.registries[0] + '/', componentName + '/') + config.components[componentName];

      if(!!options.params){
        href += '/?' + querystring.stringify(options.params);
      }

      self.render(href, options, callback);
    });

  };

  this.render = function(href, options, callback){
    if(typeof options === 'function'){
      callback = options;
      options = {};
    }

    var self = this;

    request(href, { headers: { 'render-mode': 'pre-rendered' }}, function(err, apiResponse){

      if(err){
        var errorDescription = strings.errors.client.serverSideRenderingFail;

        if(!!options.disableFailoverRendering){
          return callback(errorDescription, '');
        }

        fs.readFile(path.resolve(__dirname, '../components/oc-client/src/oc-client.min.js'), 'utf-8', function(err, clientJs){
          var clientSideHtml = format('<script class="ocClientScript">{0}</script>{1}', clientJs, self.getUnrenderedComponent(href, options));
          return callback(errorDescription, clientSideHtml);
        });

      } else {

        apiResponse = JSON.parse(apiResponse);

        var data = apiResponse.data,
            local = isLocal(apiResponse);

        if(options.render === 'client'){
          return callback(null, self.getUnrenderedComponent(href, options));
        }

        self.getStaticTemplate(apiResponse.template.src, !local, function(templateText){

          var context = {};

          vm.runInNewContext(templateText, context);

          var key = apiResponse.template.key,
              template = context.oc.components[key],
              options = {
                href: href,
                key: key,
                version: apiResponse.version,
                templateType: apiResponse.template.type
              };

          self.renderTemplate(template, data, options, callback);
        });
      }
    });
  };

  this.getUnrenderedComponent = function(href, options){

    if(!options || !options.ie8){
      return format('<oc-component href="{0}" data-rendered="false"></oc-component>', href);
    }

    return format('<script class="ocComponent">function($d,$w,oc){var href=\'href="{0}"\';' + 
                  '$d.write((!!$w.navigator.userAgent.match(/MSIE 8/))?\'<div data-oc-component="true" \'+href+\'>' +
                  '</div>\':\'<oc-component \'+href+\'></oc-component>\');oc.renderUnloadedComponents();}' +
                  '(document,window,oc);</script>', href);
  };

  this.getRenderedComponent = function(data){
    var random = Math.floor(Math.random()*9999999999);

    return format('<oc-component href="{0}" data-hash="{1}" id="{2}" data-rendered="true" data-version="{3}">{4}</oc-component>', 
                  data.href, data.key, random, data.version, data.html);
  };

  this.getStaticTemplate = function(templatePath, tryGetCached, callback){
    var self = this;
    
    if(!!tryGetCached){
      var template = self.cacheManager.get('template', templatePath);
      if(!!template){
        return callback(template);
      }
    }

    request(templatePath, function(err, template){
      self.cacheManager.set('template', templatePath, template);
      callback(template);
    });
  };

  this.renderTemplate = function(template, data, options, callback){

    var getRendered = this.getRenderedComponent;

    this.renderers[options.templateType].render(template, data, function(err, html){
      callback(err, getRendered(_.extend(options, {
        html: html
      })));
    });
  };
};

module.exports = Client;
