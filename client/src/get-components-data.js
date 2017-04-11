'use strict';

const format = require('stringformat');
const request = require('minimal-request');

const settings = require('./settings');
const HrefBuilder = require('./href-builder');
const _ = require('./utils/helpers');

module.exports = function(config){
  const hrefBuilder = new HrefBuilder(config);

  const handleErrorResponse = function(requestDetails, error, response, components) {
    let errorDetails = error ? error.toString() : undefined;

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

    const responses = [];
    _.each(components, () => {
      responses.push({
        response: {
          error: format(settings.connectionError, JSON.stringify(requestDetails), errorDetails)
        }
      });
    });

    return responses;
  };

  const performPost = function(endpoint, serverRendering, options, callback) {
    const requestDetails = {
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

    request(requestDetails, (error, responses) => {
      if(!!error || !responses || _.isEmpty(responses)){
        responses = handleErrorResponse(requestDetails, error, responses, serverRendering.components);
      }

      callback(responses);
    });
  };

  const performGet = function(endpoint, serverRendering, options, callback) {
    const component = serverRendering.components[0];
    const requestUrl = hrefBuilder.prepareServerGet(endpoint, component, options);

    const requestDetails = {
      url: requestUrl,
      method: 'get',
      headers: options.headers,
      timeout: options.timeout,
      json: true
    };

    request(requestDetails, (error, responses) => {
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
    const serverRenderingFail = settings.serverSideRenderingFail,
      serverRendering = { components: [], positions: [] },
      serverRenderingEndpoint = hrefBuilder.server(options);

    _.each(toDo, (action) => {
      if(action.render === 'server'){
        serverRendering.components.push(action.component);
        serverRendering.positions.push(action.pos);
      }
    });

    if(_.isEmpty(serverRendering.components)){
      return cb();
    } else if(!serverRenderingEndpoint){
      _.each(toDo, (action) => {
        action.result.error = serverRenderingFail;
        if(options.disableFailoverRendering){
          action.result.html = '';
          action.done = true;
        } else {
          action.render = 'client';
          action.failover = true;
        }
      });

      return cb(serverRenderingFail);
    }

    const performRequest = (serverRendering.components.length === 1) ? performGet : performPost;

    performRequest(serverRenderingEndpoint, serverRendering, options, (responses) => {
      _.each(responses, (response, i) => {
        const action = toDo[serverRendering.positions[i]];

        if(action.render === 'server'){
          if(response.status !== 200){

            let errorDetails;
            if(!response.status && response.response.error){
              errorDetails = response.response.error;
            } else {

              let errorDescription = (response.response && response.response.error);
              if(errorDescription && response.response.details && response.response.details.originalError){
                errorDescription += response.response.details.originalError;
              }

              errorDetails = format('{0} ({1})', errorDescription || '', response.status);
            }

            action.result.error = new Error(format(serverRenderingFail, errorDetails));
            if(options.disableFailoverRendering){
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