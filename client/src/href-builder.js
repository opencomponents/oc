'use strict';

var querystring = require('querystring');
var url = require('url');

module.exports = function(config){

  return {
    client: function(component){
      if(!config.registries.clientRendering){
        return null;
      }

      var versionSegment = !!component.version ? ('/' + component.version) : '',
          registryUrl = config.registries.clientRendering,
          registrySegment = registryUrl.slice(-1) === '/' ? registryUrl : (registryUrl + '/'),
          qs = !!component.parameters ? ('/?' + querystring.stringify(component.parameters)) : '';

      return url.resolve(registrySegment, component.name) + versionSegment + qs;
    }
  };
};