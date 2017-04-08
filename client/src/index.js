'use strict';

var ComponentsRenderer = require('./components-renderer');
var GetComponentsInfo = require('./get-components-info');

var sanitiser = require('./sanitiser');
var TemplateRenderer = require('./template-renderer');
var validator = require('./validator');
var Warmup = require('./warmup');
var _ = require('./utils/helpers');

module.exports = function(conf){

  var config = sanitiser.sanitiseConfiguration(conf),
    validationResult = validator.validateConfiguration(config),
    renderTemplate = new TemplateRenderer(),
    renderComponents = new ComponentsRenderer(config, renderTemplate),
    getComponentsInfo = new GetComponentsInfo(config);

  if(!validationResult.isValid){
    throw new Error(validationResult.error);
  }

  return {
    init: function(options, callback){
      var warmup = new Warmup(config, renderComponents);
      return warmup(options, callback);
    },
    renderComponent: function(componentName, options, callback){
      if(_.isFunction(options)){ 
        callback = options;
        options = {};
      }

      renderComponents([{
        name: componentName,
        version: options.version,
        parameters: options.parameters || options.params
      }], options, function(errors, results){
        if(errors) {
          return callback(errors[0], results[0]);
        }

        callback(null, results[0]);
      });
    },
    renderComponents: function(components, options, callback){
      if(_.isFunction(options)){ 
        callback = options;
        options = {};
      }
      
      renderComponents(components, options, callback);
    },
    getComponentsInfo: function(components, callback) {
      getComponentsInfo(components, callback);
    },
    renderTemplate: renderTemplate
  };
};