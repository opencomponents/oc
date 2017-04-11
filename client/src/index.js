'use strict';

const ComponentsRenderer = require('./components-renderer');
const GetComponentsInfo = require('./get-components-info');

const sanitiser = require('./sanitiser');
const TemplateRenderer = require('./template-renderer');
const validator = require('./validator');
const Warmup = require('./warmup');
const _ = require('./utils/helpers');

module.exports = function(conf){

  const config = sanitiser.sanitiseConfiguration(conf),
    validationResult = validator.validateConfiguration(config),
    renderTemplate = new TemplateRenderer(),
    renderComponents = new ComponentsRenderer(config, renderTemplate),
    getComponentsInfo = new GetComponentsInfo(config);

  if(!validationResult.isValid){
    throw new Error(validationResult.error);
  }

  return {
    init: function(options, callback){
      const warmup = new Warmup(config, renderComponents);
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
      }], options, (errors, results) => {
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