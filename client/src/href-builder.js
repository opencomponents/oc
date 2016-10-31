'use strict';

var querystring = require('querystring');
var url = require('url');

module.exports = function(config){

  return {
    client: function(component, options){

      var clientRenderingEndpoint;

      if(!!options && !!options.registries && !!options.registries.clientRendering){
        clientRenderingEndpoint = options.registries.clientRendering;
      } else if(!!config && !!config.registries && !!config.registries.clientRendering){
        clientRenderingEndpoint = config.registries.clientRendering;
      } else {
        return null;
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
    }
  };
};