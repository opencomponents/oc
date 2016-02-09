'use strict';

var ComponentsRenderer = require('./components-renderer');
var sanitiser = require('./sanitiser');
var TemplateRenderer = require('./template-renderer');
var validator = require('./validator');
var _ = require('./utils/helpers');

module.exports = function(conf){

  var config = sanitiser.sanitiseConfiguration(conf),
      validationResult = validator.validateConfiguration(config),
      renderTemplate = new TemplateRenderer(),
      renderComponents = new ComponentsRenderer(config, renderTemplate);

  if(!validationResult.isValid){
    throw new Error(validationResult.error);
  }

  this.renderTemplate = renderTemplate;

  this.renderComponent = function(componentName, options, callback){

    if(_.isFunction(options)){
      callback = options;
      options = {};
    }

    renderComponents([{
      name: componentName,
      version: options.version,
      parameters: options.parameters || options.params
    }], options, function(errors, results){
      callback(errors[0], results[0]);
    });
  };

  this.renderComponents = function(components, options, callback){

    if(_.isFunction(options)){
      callback = options;
      options = {};
    }

    renderComponents(components, options, callback);
  };
};