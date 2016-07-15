'use strict';

var async = require('async');
var _ = require('underscore');

var sanitiseHeaders = function(input){
  var headers = input || {};
  headers.accept = 'application/vnd.oc.rendered+json';
  return headers;
};

module.exports = function(renderer, conf){
  return {
    renderComponent: function(componentName, renderOptions, callback){
      return renderer({
        conf: conf,
        headers: sanitiseHeaders(renderOptions.headers),
        name: componentName,
        parameters: renderOptions.parameters,
        version: renderOptions.version
      }, function(result){
        if(result.response.error){
          return callback(result.response.error);
        } else {
          return callback(null, result.response.html);
        }
      });
    },
    renderComponents: function(components, renderOptions, callback){
      async.map(components, function(component, cb){
        renderer({
          conf: conf,
          headers: sanitiseHeaders(renderOptions.headers),
          name: component.name,
          parameters: _.extend(_.clone(renderOptions.parameters) || {}, component.parameters || {}),
          version: component.version
        }, function(result){
          var error = result.response.error;
          cb(null, error ? new Error(error) : result.response.html);
        });
      }, callback);
    }
  };
};