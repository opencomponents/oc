'use strict';

var querystring = require('querystring');
var url = require('url');
var _ = require('underscore');

function componentForType(component, baseUrl, type) {
  if (_.isString(component)) {
    component = {name: component};
  }

  var href = url.resolve(baseUrl, component.name) + '/';

  if (!!component.version) {
    href += component.version + '/';
  }

  href += '~' + type;

  return href;
}

var build = {
  component: function (component, baseUrl) {
    if (_.isString(component)) {
      component = {name: component};
    }

    var componentUrl = url.resolve(baseUrl, component.name);

    if (component.version) {
      componentUrl += '/' + component.version;
    }

    componentUrl += build.queryString(component.parameters);

    return componentUrl;
  },
  componentInfo: function (component, baseUrl) {
    return componentForType(component, baseUrl, 'info');
  },
  componentPreview: function (component, baseUrl) {
    var href = componentForType(component, baseUrl, 'preview');
    if (!!component.parameters && !_.isEmpty(component.parameters)) {
      href += '/?' + querystring.stringify(component.parameters);
    } else {
      href += '/';
    }

    return href;
  },
  queryString: function (parameters) {
    var qs = '';

    if (_.keys(parameters).length > 0) {
      qs += '?';

      _.forEach(parameters, function (parameter, key) {
        qs += key + '=' + encodeURIComponent(parameter) + '&';
      });

      if (_.keys(parameters).length > 0) {
        qs = qs.slice(0, -1);
      }
    }

    return qs;
  }
};

module.exports = build;