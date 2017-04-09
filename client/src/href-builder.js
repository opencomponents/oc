'use strict';

const querystring = require('querystring');
const url = require('url');
const settings = require('./settings');
const mergeObjects = require('./utils/merge-objects');

module.exports = function(config){
  return {
    client: function(component, options){
      let clientRenderingEndpoint;

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

      const lang = options.headers['accept-language'];
      let forwardLang = config.forwardAcceptLanguageToClient === true;

      if(!forwardLang && options.forwardAcceptLanguageToClient === true){
        forwardLang = true;
      }

      if(!!forwardLang && !!lang){
        component.parameters = component.parameters || {};
        component.parameters['__ocAcceptLanguage'] = lang;
      }

      const versionSegment = component.version ? ('/' + component.version) : '',
        registryUrl = clientRenderingEndpoint,
        registrySegment = registryUrl.slice(-1) === '/' ? registryUrl : (registryUrl + '/'),
        qs = component.parameters ? ('/?' + querystring.stringify(component.parameters)) : '';

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
      const urlPath = component.name + (component.version ? '/' + component.version : '');

      let qs = '';
      if (component.parameters || options.parameters) {
        qs = '/?' + querystring.stringify(mergeObjects(component.parameters, options.parameters));
      }

      return url.resolve(baseUrl, urlPath + qs);
    }
  };
};