'use strict';

var querystring = require('querystring');
var format = require('stringformat');
var url = require('url');
var settings = require('./settings');
var mergeObjects = require('./utils/merge-objects');

module.exports = function(config){
  return {
    client: function(component, options){
      var clientRenderingEndpoint;
      
      if(!!options && !!options.registries && !!options.registries.clientRendering){
        clientRenderingEndpoint = options.registries.clientRendering;
      } else if(!!config && !!config.registries && !!config.registries.clientRendering){
        clientRenderingEndpoint = config.registries.clientRendering;
      } else {
        throw settings.clientRenderingOptionsNotSet;
      }

      if (!component.name) {
        throw settings.missingComponentName;
      }

      var lang = options.headers['accept-language'],
          forwardLang = config.forwardAcceptLanguageToClient === true;

      if(!forwardLang && options.forwardAcceptLanguageToClient === true){
        forwardLang = true;
      }

      if(!!forwardLang && !!lang){
        component.parameters = component.parameters || {};
        component.parameters['__ocAcceptLanguage'] = lang;
      }

      var versionSegment = !!component.version ? ('/' + component.version) : '',
          registryUrl = clientRenderingEndpoint,
          registrySegment = registryUrl.slice(-1) === '/' ? registryUrl : (registryUrl + '/'),
          qs = !!component.parameters ? ('/?' + querystring.stringify(component.parameters)) : '';
      
      return url.resolve(registrySegment, component.name) + versionSegment + qs;
    },

    server: function(options) {
      if(!!options && !!options.registries && !!options.registries.serverRendering){
        return options.registries.serverRendering;
      } else if(!!config && !!config.registries){
        return config.registries.serverRendering;
      }
    },

    prepareServerGet: function(baseUrl, component, options) {
      var urlPath = component.name + (component.version ? '/' + component.version : '');

      var qs = '';
      if (component.parameters || options.parameters) {
        qs = '/?' + querystring.stringify(mergeObjects(component.parameters, options.parameters));
      }

      return url.resolve(baseUrl, urlPath + qs);
    }
  };
};