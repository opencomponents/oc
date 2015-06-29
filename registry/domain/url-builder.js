'use strict';

var url = require('url');
var _ = require('underscore');

module.exports = {
  component: function(component, baseUrl){
    if(typeof(component) === 'string'){
      component = {
        name: component
      };
    }

    var componentUrl = url.resolve(baseUrl, component.name);

    if(component.version){
      componentUrl += '/' + component.version;
    }

    if(_.keys(component.parameters).length > 0){
      componentUrl += '?';

      _.forEach(component.parameters, function(parameter, key){
        componentUrl += key + '=' + encodeURIComponent(parameter) + '&';
      });

      if(_.keys(component.parameters).length > 0){
        componentUrl = componentUrl.slice(0, -1);
      }
    }

    return componentUrl;
  }
};
