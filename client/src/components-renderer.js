'use strict';

var Cache = require('nice-cache');
var format = require('stringformat');

var GetCompiledTemplate = require('./get-compiled-template');
var GetOCClientScript = require('./get-oc-client-script');
var HrefBuilder = require('./href-builder');
var htmlRenderer = require('./html-renderer');
var request = require('./utils/request');
var settings = require('./settings');
var templates = require('./templates');
var _ = require('./utils/helpers');

var isLocal = function(apiResponse){
  return apiResponse.type === 'oc-component-local';
};

module.exports = function(config, renderTemplate){

  var cache = new Cache(config.cache),
      getOCClientScript = new GetOCClientScript(cache),
      getCompiledTemplate = new GetCompiledTemplate(cache),
      buildHref = new HrefBuilder(config);

  return function(components, options, callback){

    options = options || {};
    options.headers = options.headers || {};
    options.headers.accept = 'application/vnd.oc.unrendered+json';
    options.timeout = options.timeout || 5;
    options.container = (options.container === true) ?  true : false;
    options.renderInfo = (options.renderInfo === false) ? false : true;

    _.each(components, function(component){
      component.version = component.version || config.components[component.name];
    });

    var errors = [], 
        results = [];
    
    if(options.render === 'client'){
      _.each(components, function(component){
        errors.push(null);
        results.push(htmlRenderer.unrenderedComponent(buildHref.client(component), options));
      });
      return callback(errors, results);
    }

    request({
      url: config.registries.serverRendering,
      method: 'post',
      headers: options.headers,
      timeout: options.timeout,
      json: true,
      body: { components: components }
    }, function(err, apiResponse){

      var errorDescription = settings.messages.serverSideRenderingFail,
          componentsToRender = [];

      getOCClientScript(function(clientErr, clientJs){

        var getFailoverReponse = function(component){
          var componentClientHref = buildHref.client(component);
                
          if(!!options.disableFailoverRendering || !!clientErr || !componentClientHref){
            return '';
          } else {
            var unrenderedComponentTag = htmlRenderer.unrenderedComponent(componentClientHref, options);
            return format(templates.clientScript, clientJs, unrenderedComponentTag);
          }
        };

        var setErrorResponseForComponent = function(pos){
          errors[pos] = errorDescription;
          results[pos] = getFailoverReponse(components[pos]);
        };

        if(!!err || !apiResponse){
          _.each(components, function(component, i){
            setErrorResponseForComponent(i);
          });

          return callback(errors, results);
        }

        _.each(apiResponse, function(componentResponse, i){
          if(components[i].render === 'client'){ console.log('hi');
            errors[i] = null;
            results[i] = htmlRenderer.unrenderedComponent(buildHref.client(components[i]), options);
          } else if(componentResponse.status >= 400){
            setErrorResponseForComponent(i);
          } else {
            errors[i] = null;
            componentsToRender.push({ pos: i, res: componentResponse.response });  
          }
        });

        if(_.isEmpty(componentsToRender)){
          return callback(errors, results);
        }

        var toDo = componentsToRender.length;
        var fetchTemplateAndRender = function(component, pos, cb){
          var data = component.data,
              useCache = !isLocal(component);
              
          getCompiledTemplate(component.template, useCache, options.timeout, function(err, template){

            if(!!err){ 
              setErrorResponseForComponent(pos);
              return cb(err);
            }

            var renderOptions = {
              href: component.href,
              key: component.template.key,
              version: component.version,
              templateType: component.template.type,
              container: options.container,
              renderInfo: options.renderInfo,
              name: component.name
            };

            return renderTemplate(template, data, renderOptions, function(err, res){
              if(!!err){
                setErrorResponseForComponent(pos);
              } else {
                results[pos] = res;
              }
              cb(err, res);
            });
          });
        };

        var next = function(){
          toDo--;
          if(toDo === 0){
            return callback(errors, results);
          }
        };

        _.each(componentsToRender, function(component){
          fetchTemplateAndRender(component.res, component.pos, next);
        });
      });
    });
  };
};