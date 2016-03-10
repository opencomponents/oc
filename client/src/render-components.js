'use strict';

var format = require('stringformat');

var GetCompiledTemplate = require('./get-compiled-template');
var settings = require('./settings');
var _ = require('./utils/helpers');

module.exports = function(cache, renderTemplate){

  var getCompiledTemplate = new GetCompiledTemplate(cache);

  var fetchTemplateAndRender = function(component, options, cb){

    var data = component.data,
        isLocal = component.type === 'oc-component-local',
        useCache = !isLocal;
        
    getCompiledTemplate(component.template, useCache, options.timeout, function(err, template){
      if(!!err){ return cb(err); }

      var renderOptions = {
        container: options.container,
        href: component.href,
        key: component.template.key,
        name: component.name,
        renderInfo: options.renderInfo,
        templateType: component.template.type,
        version: component.version
      };

      renderTemplate(template, data, renderOptions, cb);
    });
  };

  return function(toDo, options, cb){

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
      fetchTemplateAndRender(action.apiResponse, options, function(err, html){
        if(!!err){
          var errorDetails = format('{0} ({1})', (err.response && err.response.error), err.status);
          action.result.error = new Error(format(settings.serverRenderingFail, errorDetails));
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
};