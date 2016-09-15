'use strict';

var format = require('stringformat');
var request = require('minimal-request');

var settings = require('./settings');
var _ = require('./utils/helpers');

module.exports = function(config, renderComponents){
  return function(options, cb){

    cb = cb || _.noop;

    if(!config || !config.registries || !config.registries.serverRendering){
      return cb(null, {});
    }

    config.components = config.components || {};
    config.components['oc-client'] = config.components['oc-client'] || '';

    if(config.registries.serverRendering.slice(-1) !== '/'){
      config.registries.serverRendering = config.registries.serverRendering + '/';
    }

    options.timeout = options.timeout || 5;
    options.headers = options.headers || {};

    var urls = [],
        toWarmup = [];

    _.each(config.components, function(version, name){
      var versionSegment = version ? (version + '/') : '';
      urls.push(config.registries.serverRendering + name + '/' + versionSegment + '~info');
    });

    _.eachAsync(urls, function(url, next){

      var requestDetails = {
        url: url,
        json: true,
        headers: options.headers,
        method: 'GET',
        timeout: options.timeout
      };

      request(requestDetails, function(err, componentInfo){
        if(err){
          return next(new Error(format(settings.warmupFailed, JSON.stringify(requestDetails), err)));
        }

        var parameters = componentInfo.oc.parameters,
            componentToWarmup = { 
              name: componentInfo.name,
              version: componentInfo.version,
              parameters: {}
            };

        if(!!parameters){
          _.each(parameters, function(value, parameter){
            if(!!value.mandatory){
              componentToWarmup.parameters[parameter] = value.example;
            }
          });
        }

        toWarmup.push(componentToWarmup);
        next();
      });
    }, function(err){
      if(err){ return cb(err); }
      options.renderInfo = false;
      options.container = false;

      renderComponents(toWarmup, options, function(errors, results){
        var response = {};
        _.each(toWarmup, function(component, i){
          response[component.name] = results[i];
        });
        
        cb(null, response);
      });
    });
  };
};