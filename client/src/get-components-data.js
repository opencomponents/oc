'use strict';

var format = require('stringformat');
var request = require('minimal-request');

var settings = require('./settings');
var _ = require('./utils/helpers');
var url = require('url');

module.exports = function(config){

  var handleErrorResponse = function(requestDetails, error, response, components) {
    var errorDetails = error ? error.toString() : undefined;

    if (response && response.error) {
      if (errorDetails) {
        errorDetails = format('{0} {1}', errorDetails, response.error); 
      } else {
        errorDetails = response.error;
      }
    }
    
    if (!errorDetails) {
      errorDetails = settings.emptyResponse;
    }

    var responses = [];
    _.each(components, function(){
      responses.push({
        response: {
          error: format(settings.connectionError, JSON.stringify(requestDetails), errorDetails)
        }
      });
    });
    
    return responses;
  };

  var performPost = function(endpoint, serverRendering, options, callback) {
    var requestDetails = {
      url: endpoint,
      method: 'post',
      headers: options.headers,
      timeout: options.timeout,
      json: true,
      body: {
        components: serverRendering.components,
        parameters: options.parameters || {}
      }
    };

    request(requestDetails, function(error, responses) {
      if(!!error || !responses || _.isEmpty(responses)){
        responses = handleErrorResponse(requestDetails, error, responses, serverRendering.components);
      }

      callback(responses);
    });
  };

  var performGet = function(endpoint, serverRendering, options, callback) {
    var component = serverRendering.components[0];
    var urlPath = component.name + (component.version ? '/' + component.version : '');
    var queryString;

    if (options.parameters) {
      queryString = Object
        .keys(options.parameters)
        .map(function(key) {
          return format('{0}={1}', key, encodeURIComponent(options.parameters[key]));
        })
        .reduce(function(a, b) {
          if (!a) {
            return b;
          } else {
            return format('{0}&{1}', a, b);
          }
        }, null);
    }

    var requestDetails = {
      url: url.resolve(endpoint, urlPath + (queryString ? '?' + queryString : '')),
      method: 'get',
      headers: options.headers,
      timeout: options.timeout,
      json: true
    };

    request(requestDetails, function(error, responses) {
      if(!!error || !responses || _.isEmpty(responses)) {
        responses = handleErrorResponse(requestDetails, error, responses, serverRendering.components);
      } else {
        //Prepare the response in case the request is a GET for a single component
        responses = [{
          response: responses,
          status: 200
        }];
      }

      callback(responses);
    });
  };

  return function(toDo, options, cb){
    var serverRenderingFail = settings.serverSideRenderingFail,
        serverRendering = { components: [], positions: [] },
        serverRenderingEndpoint;

    if(!!options && !!options.registries && !!options.registries.serverRendering){
      serverRenderingEndpoint = options.registries.serverRendering;
    } else if(!!config && !!config.registries){
      serverRenderingEndpoint = config.registries.serverRendering;
    }

    _.each(toDo, function(action){
      if(action.render === 'server'){
        serverRendering.components.push(action.component);
        serverRendering.positions.push(action.pos);
      }
    });

    if(_.isEmpty(serverRendering.components)){
      return cb();
    } else if(!serverRenderingEndpoint){
      _.each(toDo, function(action){
        action.result.error = serverRenderingFail;
        if(!!options.disableFailoverRendering){
          action.result.html = '';
          action.done = true;
        } else {
          action.render = 'client';
          action.failover = true;
        }
      });
      
      return cb(serverRenderingFail);
    }

    var performRequest = (serverRendering.components.length === 1) ? performGet : performPost;
    
    performRequest(serverRenderingEndpoint, serverRendering, options, function(responses) {
      _.each(responses, function(response, i){
        var action = toDo[serverRendering.positions[i]];

        if(action.render === 'server'){
          if(response.status !== 200){
            
            var errorDetails;
            if(!response.status && response.response.error){
              errorDetails = response.response.error;
            } else {
              
              var errorDescription = (response.response && response.response.error);
              if(errorDescription && response.response.details && response.response.details.originalError){
                errorDescription += response.response.details.originalError;
              }

              errorDetails = format('{0} ({1})', errorDescription || '', response.status);
            }

            action.result.error = new Error(format(serverRenderingFail, errorDetails));
            if(!!options.disableFailoverRendering){
              action.result.html = '';
              action.done = true;
            } else {
              action.render = 'client';
              action.failover = true;
            }
          } else {
            action.apiResponse = response.response;
          }
        }
      });
      cb();
    });
  };
};