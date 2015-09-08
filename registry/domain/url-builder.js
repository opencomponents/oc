'use strict';

var url = require('url');
var _ = require('underscore');

var build = {
  component: function(component, baseUrl){
    if(_.isString(component)){
      component = { name: component };
    }

    var componentUrl = url.resolve(baseUrl, component.name);

    if(component.version){
      componentUrl += '/' + component.version;
    }

    componentUrl += build.queryString(component.parameters);

    return componentUrl;
  },
  queryString: function(parameters){
    var qs = '';

    if(_.keys(parameters).length > 0){
      qs += '?';

      _.forEach(parameters, function(parameter, key){
        qs += key + '=' + encodeURIComponent(parameter) + '&';
      });

      if(_.keys(parameters).length > 0){
        qs = qs.slice(0, -1);
      }
    }

    return qs;
  }
};

module.exports = build;