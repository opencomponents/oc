'use strict';

var querystring = require('querystring');
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
  componentPreview: function(component, baseUrl){
    var href = baseUrl + component.name + '/';

    if(!!component.version){
      href += component.version + '/';
    }

    href += '~preview/';

    if(!!component.parameters && !_.isEmpty(component.parameters)){
      href += '?' + querystring.stringify(component.parameters);
    }

    return href;
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