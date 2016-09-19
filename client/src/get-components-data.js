'use strict';

var format = require('stringformat');
var request = require('minimal-request');

var settings = require('./settings');
var _ = require('./utils/helpers');

module.exports = function(config){

  return function(toDo, options, cb){

    var serverRenderingFail = settings.serverSideRenderingFail,
        serverRendering = { components: [], positions: [] };

    _.each(toDo, function(action){
      if(action.render === 'server'){
        serverRendering.components.push(action.component);
        serverRendering.positions.push(action.pos);
      }
    });

    if(_.isEmpty(serverRendering.components)){
      return cb();
    } else if(!config.registries.serverRendering){
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

    var requestDetails = {
      url: config.registries.serverRendering,
      method: 'post',
      headers: options.headers,
      timeout: options.timeout,
      json: true,
      body: {
        components: serverRendering.components
      }
    };

    request(requestDetails, function(error, responses){
      if(!!error || !responses || _.isEmpty(responses)){
        responses = [];
        var errorDetails = !!error ? error.toString() : settings.emptyResponse;
        _.each(serverRendering.components, function(){
          responses.push({
            response: {
              error: format(settings.connectionError, JSON.stringify(requestDetails), errorDetails)
            }
          });
        });
      }

      _.each(responses, function(response, i){
        var action = toDo[serverRendering.positions[i]];

        if(action.render === 'server'){
          if(response.status !== 200){
            
            var errorDetails;
            if(!response.status && response.response.error){
              errorDetails = response.response.error;
            } else {
              errorDetails = format('{0} ({1})', (response.response && response.response.error) || '', response.status);
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