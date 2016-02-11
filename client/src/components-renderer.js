'use strict';

var Cache = require('nice-cache');
var format = require('stringformat');

var GetCompiledTemplate = require('./get-compiled-template');
var GetOCClientScript = require('./get-oc-client-script');
var HrefBuilder = require('./href-builder');
var htmlRenderer = require('./html-renderer');
var request = require('./utils/request');
var sanitiser = require('./sanitiser');
var settings = require('./settings');
var templates = require('./templates');
var _ = require('./utils/helpers');

module.exports = function(config, renderTemplate){

  var cache = new Cache(config.cache),
      getOCClientScript = new GetOCClientScript(cache),
      getCompiledTemplate = new GetCompiledTemplate(cache),
      buildHref = new HrefBuilder(config),
      serverRenderingFail = settings.serverSideRenderingFail;

  return function(components, options, callback){

    options = sanitiser.sanitiseGlobalRenderOptions(options, config);

    var toDo = [];

    _.each(components, function(component, i){
      component.version = component.version || config.components[component.name];
      toDo.push({
        component: component,
        pos: i,
        render: component.render || options.render || 'server',
        result: {}
      });
    });

    var makePostRequest = function(components, cb){
      request({
        url: config.registries.serverRendering,
        method: 'post',
        headers: options.headers,
        timeout: options.timeout,
        json: true,
        body: { components: components }
      }, cb);
    };

    var getComponentsData = function(cb){

      var serverRendering = {
        components: [],
        positions: []
      };

      _.each(toDo, function(action){
        if(action.render === 'server'){
          serverRendering.components.push(action.component);
          serverRendering.positions.push(action.pos);
        }
      });

      if(_.isEmpty(serverRendering.components)){
        return cb();
      } else if(!config.registries.serverRendering){
        _.each(toDo, function(action){
          action.result.error = serverRenderingFail;
          if(!!options.disableFailoverRendering){
            action.result.html = '';
            action.done = true;
          } else {
            action.render = 'client';
            action.failover = true;
          }
        });
        
        return cb(serverRenderingFail);
      }

      makePostRequest(serverRendering.components, function(error, responses){
        if(!!error || !responses || _.isEmpty(responses)){
          responses = [];
          _.each(serverRendering.components, function(){
            responses.push({ status: -1 });
          });
        }

        _.each(responses, function(response, i){
          var action = toDo[serverRendering.positions[i]];

          if(action.render === 'server'){
            if(response.status !== 200){
              action.result.error = serverRenderingFail;
              if(!!options.disableFailoverRendering){
                action.result.html = '';
                action.done = true;
              } else {
                action.render = 'client';
                action.failover = true;
              }
            } else {
              action.apiResponse = response.response;
            }
          }
        });
        cb();
      });
    };

    var fetchTemplateAndRender = function(component, cb){

      var data = component.data,
          isLocal = component.type === 'oc-component-local',
          useCache = !isLocal;
          
      getCompiledTemplate(component.template, useCache, options.timeout, function(err, template){
        if(!!err){ return cb(err); }

        var renderOptions = {
          href: component.href,
          key: component.template.key,
          version: component.version,
          templateType: component.template.type,
          container: options.container,
          renderInfo: options.renderInfo,
          name: component.name
        };

        renderTemplate(template, data, renderOptions, cb);
      });
    };

    var renderComponents = function(cb){

      var toRender = [];

      _.each(toDo, function(action){
        if(action.render === 'server' && !!action.apiResponse){
          toRender.push(action);
        }
      });

      if(_.isEmpty(toRender)){
        return cb();
      }

      _.eachAsync(toRender, function(action, next){
        fetchTemplateAndRender(action.apiResponse, function(err, html){
          if(!!err){
            action.result.error = serverRenderingFail;
            if(!!options.disableFailoverRendering){
              action.result.html = '';
              action.done = true;
            } else {
              action.render = 'client';
              action.failover = true;
            }
          } else {
            action.result.html = html;
            action.done = true;
          }
          next();
        });
      }, cb);
    };

    var processClientReponses = function(cb){
      var toProcess = [];

      _.each(toDo, function(action){
        if(action.render === 'client' && !action.done){
          toProcess.push(action);
        }
      });

      if(_.isEmpty(toProcess)){
        return cb();
      }

      getOCClientScript(function(clientErr, clientJs){
        _.each(toDo, function(action){
          if(action.render === 'client'){
            if(!!clientErr || !clientJs){
              action.result.error = settings.genericError;
              action.result.html = '';
            } else {
              var componentClientHref = buildHref.client(action.component);

              if(!componentClientHref){
                action.result.error = settings.clientSideRenderingFail;
                action.result.html = '';
              } else {
                var unrenderedComponentTag = htmlRenderer.unrenderedComponent(componentClientHref, options);

                if(action.failover){
                  action.result.html = format(templates.clientScript, clientJs, unrenderedComponentTag);
                } else {
                  action.result.error = null;
                  action.result.html = unrenderedComponentTag;
                }
              }
            }
          }
        });
        cb();
      });
    };

    getComponentsData(function(){
      renderComponents(function(){
        processClientReponses(function(){
          var errors = [], 
              results = [];
        
          _.each(toDo, function(action){
            errors.push(action.result.error);
            results.push(action.result.html);
          });
          callback(errors, results);
        });
      });
    });
  };
};