'use strict';

var Cache = require('nice-cache');

var GetComponentsData = require('./get-components-data');
var ProcessClientResponse = require('./process-client-responses');
var RenderComponents = require('./render-components');
var sanitiser = require('./sanitiser');
var _ = require('./utils/helpers');

module.exports = function(config, renderTemplate){

  var cache = new Cache(config.cache),
      getComponentsData = new GetComponentsData(config),
      renderComponents = new RenderComponents(cache, renderTemplate),
      processClientReponses = new ProcessClientResponse(cache, config);

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

    getComponentsData(toDo, options, function(){
      renderComponents(toDo, options, function(){
        processClientReponses(toDo, options, function(){
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