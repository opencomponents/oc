'use strict';

const format = require('stringformat');
const request = require('minimal-request');

const settings = require('./settings');
const sanitiser = require('./sanitiser');
const _ = require('./utils/helpers');

module.exports = function(config) {

  return function(components, options, callback) {
    if (!_.isArray(components)) {
      components = [components];
    }

    if (_.isFunction(options)) {
      callback = options;
    }

    options = sanitiser.sanitiseGlobalGetInfoOptions(options);

    let serverRenderingEndpoint;
    if(!!options && !!options.registries && !!options.registries.serverRendering){
      serverRenderingEndpoint = options.registries.serverRendering;
    } else if(!!config && !!config.registries){
      serverRenderingEndpoint = config.registries.serverRendering;
    }

    const actions = { requestedComponents: [], responseData: [] };

    _.each(components, (component) => {
      actions.requestedComponents.push({
        name: component.name,
        version: component.version
      });

      actions.responseData.push({
        componentName: component.name,
        requestedVersion: component.version
      });
    });

    const requestDetails = {
      url: serverRenderingEndpoint,
      method: 'post',
      headers: options.headers,
      timeout: options.timeout,
      json: true,
      body: {
        components: actions.requestedComponents
      }
    };

    request(requestDetails, (error, responses) => {
      if(!!error || !responses || _.isEmpty(responses)) {
        responses = [];
        const errorDetails = error ? error.toString() : settings.emptyResponse;
        _.each(actions.requestedComponents, () => {
          responses.push({
            response: {
              error: format(settings.connectionError, JSON.stringify(requestDetails), errorDetails)
            }
          });
        });
      }

      const errors = [];
      let hasErrors = false;

      _.each(responses, (response, i) => {
        const responseData = actions.responseData[i];

        if (response.status !== 200) {
          let errorDetails;
          if (!response.status && response.response.error) {
            errorDetails = response.response.error;
          } else {
            let errorDescription = (response.response && response.response.error);
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