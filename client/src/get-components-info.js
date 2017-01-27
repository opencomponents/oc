'use strict';

var format = require('stringformat');
var request = require('minimal-request');

var settings = require('./settings');
var sanitiser = require('./sanitiser');
var _ = require('./utils/helpers');

module.exports = function(config) {

  return function(components, options, callback) {
    if (!_.isArray(components)) {
      components = [components];
    }

    if (_.isFunction(options)) {
      callback = options;
    }

    options = sanitiser.sanitiseGlobalGetInfoOptions(options);

    var serverRenderingEndpoint;
    if(!!options && !!options.registries && !!options.registries.serverRendering){
      serverRenderingEndpoint = options.registries.serverRendering;
    } else if(!!config && !!config.registries){
      serverRenderingEndpoint = config.registries.serverRendering;
    }

    var actions = { requestedComponents: [], responseData: [] };

    _.each(components, function(component) {
      actions.requestedComponents.push({
        name: component.name,
        version: component.version
      });

      actions.responseData.push({
        componentName: component.name,
        requestedVersion: component.version
      });
    });
    
    var requestDetails = {
      url: serverRenderingEndpoint,
      method: 'post',
      headers: options.headers,
      timeout: options.timeout,
      json: true,
      body: {
        components: actions.requestedComponents
      }
    };

    request(requestDetails, function(error, responses) {
      if(!!error || !responses || _.isEmpty(responses)) {
        responses = [];
        var errorDetails = !!error ? error.toString() : settings.emptyResponse;
        _.each(actions.requestedComponents, function(){
          responses.push({
            response: {
              error: format(settings.connectionError, JSON.stringify(requestDetails), errorDetails)
            }
          });
        });
      }

      var errors = [];
      var hasErrors = false;

      _.each(responses, function(response, i) {
        var action = actions.requestedComponents[i];
        var responseData = actions.responseData[i];

        if (response.status !== 200) {
          var errorDetails;
          if (!response.status && response.response.error) {
            errorDetails = response.response.error;
          } else {
            var errorDescription = (response.response && response.response.error);
            if (errorDescription && response.response.details && response.response.details.originalError) {
              errorDescription += response.response.details.originalError;
            }
            errorDetails = format('{0} ({1})', errorDescription || '', response.status);
          }

          responseData.error = new Error(format(settings.componentGetInfoFail, errorDetails));
          errors.push(responseData.error);
          hasErrors = true;
        } else {
          responseData.apiResponse = response.response;
          errors.push(null);
        }
      });

      callback(hasErrors ? errors : null, actions.responseData);
    });
  };
};