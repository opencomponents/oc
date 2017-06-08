'use strict';

const querystring = require('querystring');
const url = require('url');
const _ = require('lodash');

function componentForType(component, baseUrl, type) {
  if (_.isString(component)) {
    component = { name: component };
  }

  let href = url.resolve(baseUrl, component.name) + '/';

  if (component.version) {
    href += component.version + '/';
  }

  href += '~' + type;

  return href;
}

const build = {
  component: function(component, baseUrl) {
    if (_.isString(component)) {
      component = { name: component };
    }

    let componentUrl = url.resolve(baseUrl, component.name);

    if (component.version) {
      componentUrl += '/' + component.version;
    }

    componentUrl += build.queryString(component.parameters);

    return componentUrl;
  },
  componentInfo: function(component, baseUrl) {
    return componentForType(component, baseUrl, 'info');
  },
  componentPreview: function(component, baseUrl) {
    let href = componentForType(component, baseUrl, 'preview');
    if (!!component.parameters && !_.isEmpty(component.parameters)) {
      href += '/?' + querystring.stringify(component.parameters);
    } else {
      href += '/';
    }

    return href;
  },
  queryString: function(parameters) {
    let qs = '';

    if (_.keys(parameters).length > 0) {
      qs += '?';

      _.forEach(parameters, (parameter, key) => {
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
