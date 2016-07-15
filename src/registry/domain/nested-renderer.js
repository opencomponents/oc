'use strict';

var async = require('async');
var _ = require('underscore');

var sanitise = { 
  componentParams: function(component, options, callback){
    return _.extend(sanitise.options(options, callback), {
      componentName: component
    });
  },
  componentsParams: function(components, options, callback){
    return _.extend(sanitise.options(options, callback), {
      components: components
    });
  },
  headers: function(h){
    return _.extend({}, h, {
      accept: 'application/vnd.oc.rendered+json'
    });
  },
  options: function(options, callback){
    if(!callback && _.isFunction(options)){
      callback = options;
      options = {};
    }

    return {
      callback: callback,
      options: options || {}
    };
  }
};

var validate = {
  callback: function(c){
    if(!c || !_.isFunction(c)){
      throw new Error('callback is not valid');
    }
  },
  componentParams: function(params){
    if(!params.componentName){
      throw new Error('component\'s name is not valid');
    }

    validate.callback(params.callback);
  },
  componentsParams: function(params){
    if(_.isEmpty(params.components)){
      throw new Error('components is not valid');
    }

    validate.callback(params.callback);
  }
};

module.exports = function(renderer, conf){
  return {
    renderComponent: function(componentName, renderOptions, callback){

      var p = sanitise.componentParams(componentName, renderOptions, callback);
      validate.componentParams(p);

      return renderer({
        conf: conf,
        headers: sanitise.headers(p.options.headers),
        name: componentName,
        parameters: p.options.parameters || {},
        version: p.options.version || ''
      }, function(result){
        if(result.response.error){
          return p.callback(result.response.error);
        } else {
          return p.callback(null, result.response.html);
        }
      });
    },
    renderComponents: function(components, renderOptions, callback){

      var p = sanitise.componentsParams(components, renderOptions, callback);
      validate.componentsParams(p);

      async.map(p.components, function(component, cb){
        renderer({
          conf: conf,
          headers: sanitise.headers(p.options.headers),
          name: component.name,
          parameters: _.extend(_.clone(p.options.parameters) || {}, component.parameters || {}),
          version: component.version || ''
        }, function(result){
          var error = result.response.error;
          cb(null, error ? new Error(error) : result.response.html);
        });
      }, p.callback);
    }
  };
};