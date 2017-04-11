'use strict';

const format = require('stringformat');

const GetCompiledTemplate = require('./get-compiled-template');
const settings = require('./settings');
const _ = require('./utils/helpers');

module.exports = function(cache, renderTemplate){

  const getCompiledTemplate = new GetCompiledTemplate(cache);

  const fetchTemplateAndRender = function(component, options, cb){

    const data = component.data,
      isLocal = component.type === 'oc-component-local',
      useCache = !isLocal;

    getCompiledTemplate(component.template, useCache, options.timeout, (err, template) => {
      if(err){ return cb(err); }

      const renderOptions = {
        container: component.container,
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

    const toRender = [];

    _.each(toDo, (action) => {
      if(action.render === 'server' && !!action.apiResponse){
        toRender.push(action);
      }
    });

    if(_.isEmpty(toRender)){
      return cb();
    }

    _.eachAsync(toRender, (action, next) => {

      action.apiResponse.container = action.container;

      fetchTemplateAndRender(action.apiResponse, options, (err, html) => {
        if(err){
          const errorDetails = format('{0} ({1})', (err.response && err.response.error), err.status);
          action.result.error = new Error(format(settings.serverSideRenderingFail, errorDetails));
          if(options.disableFailoverRendering){
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